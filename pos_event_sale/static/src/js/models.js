/*
Copyright 2021 Camptocamp SA - Iván Todorovich
License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
*/

odoo.define("pos_event_sale.models", function(require) {
    "use strict";

    const models = require("point_of_sale.models");
    const utils = require("web.utils");
    const core = require("web.core");
    const _t = core._t;
    const round_di = utils.round_decimals;

    models.PosModel = models.PosModel.extend({
        /**
         * @returns Quantity of event tickets ordered in unsaved paid orders.
         *          Accounts for unsaved paid orders + current order.
         *          {ticket_id: qty}
         */
        get_ordered_event_tickets: function() {
            const orders = [...this.db.get_orders(), this.get_order()];
            return orders.reduce((map, order) => {
                const ordered = order.get_ordered_event_tickets();
                return Object.keys(ordered).reduce((map, ticket_id) => {
                    map[ticket_id] = map[ticket_id] || 0.0;
                    map[ticket_id] += ordered[ticket_id];
                    return map;
                }, map);
            }, {});
        },
    });

    models.Order = models.Order.extend({
        /**
         * @returns Quantity of event tickets ordered in this order.
         *          {ticket_id: qty}
         */
        get_ordered_event_tickets: function() {
            return this.get_orderlines()
                .filter(line => line.event_ticket_id)
                .reduce((map, line) => {
                    map[line.event_ticket_id] = map[line.event_ticket_id] || 0;
                    map[line.event_ticket_id] += line.quantity;
                    return map;
                }, {});
        },

        /**
         * Updates and check the ordered events availability
         * Requires an active internet connection.
         *
         * @returns Promise that resolves if all is ok.
         */
        update_and_check_event_availablity: function() {
            const event_tickets = _.unique(
                this.pos
                    .get_order()
                    .get_orderlines()
                    .filter(line => line.event_ticket_id)
                    .map(line => line.get_event_ticket())
            );
            const limited_event_tickets = event_tickets.filter(
                ticket =>
                    ticket.seats_availability !== "unlimited" ||
                    ticket.event_id.seats_availability !== "unlimited"
            );
            const limited_events = _.unique(
                limited_event_tickets.map(ticket => ticket.event_id.id)
            );
            // Nothing to check!
            if (!limited_events.length) {
                return Promise.resolve();
            }
            // Update seats_available from backend
            return new Promise((resolve, reject) => {
                this.pos.db
                    .update_event_seats_available(limited_events, {
                        shadow: false,
                        timeout: 5000,
                    })
                    .then(() => {
                        for (const ticket of limited_event_tickets) {
                            if (this.pos.get_event_ticket_seats_available(ticket) < 0) {
                                return reject({
                                    error: "unavailable_seats",
                                    ticket: ticket,
                                    title: _t("No available seats"),
                                    message: _.str.sprintf(
                                        _t(
                                            "Not enough available seats for ticket %s (%s)"
                                        ),
                                        ticket.name,
                                        ticket.event_id.display_name
                                    ),
                                });
                            }
                        }
                        return resolve();
                    })
                    .catch(error => {
                        return reject({
                            error: "exception",
                            title: "Exception",
                            message: _t(
                                "Unable to check event tickets availability. Please check your internet connection"
                            ),
                            exception: error,
                        });
                    });
            });
        },
    });

    const OrderlineSuper = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        /**
         * @returns the event.ticket object
         */
        get_event_ticket: function() {
            if (this.event_ticket_id) {
                return this.pos.db.get_event_ticket_by_id(this.event_ticket_id);
            }
        },

        /**
         * @returns the event object related to this line event.ticket
         */
        get_event: function() {
            if (this.event_ticket_id) {
                const ticket = this.get_event_ticket();
                return ticket.event_id;
            }
        },

        /**
         * @override
         */
        get_lst_price: function() {
            if (this.event_ticket_id) {
                return this.get_event_ticket().price;
            }
            return OrderlineSuper.get_lst_price.apply(this, arguments);
        },

        /**
         * @override
         */
        set_lst_price: function(price) {
            if (this.event_ticket_id) {
                this.order.assert_editable();
                this.get_event_ticket().price = round_di(
                    parseFloat(price) || 0,
                    this.pos.dp["Product Price"]
                );
            }
            return OrderlineSuper.set_lst_price.apply(this, arguments);
        },

        /**
         * Handle merging of lines with events.
         * We want to allow merging when tickets are the same.
         * We have to completely override this method in order for it to work,
         * to consider the event ticket prices because the core method works
         * only with product prices, and completely ignores price_manually_set.
         *
         * @override
         */
        can_be_merged_with: function(orderline) {
            if (this.event_ticket_id !== orderline.event_ticket_id) {
                return false;
            }
            if (this.event_ticket_id) {
                if (this.get_product().id !== orderline.get_product().id) {
                    return false;
                } else if (!this.get_unit() || !this.get_unit().is_pos_groupable) {
                    return false;
                } else if (this.get_discount() > 0) {
                    return false;
                } else if (
                    !utils.float_is_zero(
                        this.price - orderline.price,
                        this.pos.currency.decimals
                    )
                ) {
                    return false;
                } else if (this.product.tracking === "lot") {
                    return false;
                }
                return true;
            }
            return OrderlineSuper.can_be_merged_with.apply(this, arguments);
        },

        /**
         * @override
         */
        init_from_JSON: function(json) {
            OrderlineSuper.init_from_JSON.apply(this, arguments);
            this.event_ticket_id = json.event_ticket_id;
            // This line can be removed if https://github.com/odoo/odoo/pull/60462 gets merged
            this.price_manually_set = json.price_manually_set;
        },

        /**
         * @override
         */
        export_as_JSON: function() {
            const res = OrderlineSuper.export_as_JSON.apply(this, arguments);
            res.event_ticket_id = this.event_ticket_id;
            // This line can be removed if https://github.com/odoo/odoo/pull/60462 gets merged
            res.price_manually_set = this.price_manually_set;
            return res;
        },

        /**
         * @override
         */
        export_for_printing: function() {
            const res = OrderlineSuper.export_for_printing.apply(this, arguments);
            if (this.event_ticket_id) {
                res.event = this.get_event();
                res.event_ticket = this.get_event_ticket();
                res.product_name = _.str.sprintf(
                    "%s (%s)",
                    this.get_event().display_name,
                    this.get_event_ticket().name
                );
                res.product_name_wrapped = this._generate_wrapped_string(
                    res.product_name
                );
            }
            return res;
        },

        /**
         * Similar implementation to core method: generate_wrapped_product_name
         * However this one takes str and maxLength parameters
         *
         * @param {String} str
         * @param {Number} maxLength
         * @returns Array of truncated strings
         */
        _generate_wrapped_string: function(str, maxLength) {
            // 40 * line ratio of .6 = 24
            if (!maxLength) maxLength = 24;
            var wrapped = [];
            var current_line = "";
            while (str.length > 0) {
                var space_index = str.indexOf(" ");
                if (space_index === -1) {
                    space_index = str.length;
                }
                if (current_line.length + space_index > maxLength) {
                    if (current_line.length) {
                        wrapped.push(current_line);
                    }
                    current_line = "";
                }
                current_line += str.slice(0, space_index + 1);
                str = str.slice(space_index + 1);
            }
            if (current_line.length) {
                wrapped.push(current_line);
            }
            return wrapped;
        },
    });

    models.load_fields("product.product", ["event_ok"]);

    models.load_models([
        {
            model: "event.event",
            label: "Events",
            fields: [
                "name",
                "display_name",
                "event_type_id",
                "country_id",
                "date_begin",
                "date_end",
                "seats_availability",
                "seats_available",
            ],
            condition: function(self) {
                return self.config.iface_event_sale;
            },
            domain: function(self) {
                const domain = [
                    ["state", "=", "confirm"],
                    "|",
                    ["company_id", "=", self.config.company_id[0]],
                    ["company_id", "=", false],
                ];
                if (self.config.iface_available_event_type_ids.length) {
                    domain.push([
                        "event_type_id",
                        "in",
                        self.config.iface_available_event_type_ids,
                    ]);
                }
                if (!self.config.iface_load_past_events) {
                    domain.push(["date_end", ">=", new Date()]);
                }
                return domain;
            },
            loaded: function(self, records) {
                self.db.add_events(records);
            },
        },
        {
            model: "event.event.ticket",
            after: "event.event",
            label: "Event Tickets",
            fields: [
                "name",
                "event_id",
                "product_id",
                "price",
                "seats_availability",
                "seats_available",
            ],
            condition: function(self) {
                return self.config.iface_event_sale;
            },
            domain: function(self) {
                const event_ids = Object.keys(self.db.event_by_id).map(id =>
                    Number(id)
                );
                return [
                    ["product_id.active", "=", true],
                    ["product_id.available_in_pos", "=", true],
                    ["event_id", "in", event_ids],
                ];
            },
            loaded: function(self, records) {
                self.db.add_event_tickets(records);
            },
        },
    ]);

    return models;
});
