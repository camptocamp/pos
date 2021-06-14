/*
Copyright 2021 Camptocamp SA - Iván Todorovich
License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
*/

odoo.define("pos_event_sale.EventTicketsPopup", function(require) {
    "use strict";

    const PopupWidget = require("point_of_sale.popups");
    const gui = require("point_of_sale.gui");
    const core = require("web.core");
    const QWeb = core.qweb;

    const EventTicketsPopup = PopupWidget.extend({
        template: "EventTicketsPopup",
        events: _.extend({}, PopupWidget.prototype.events, {
            "click article.ticket:not(.disabled)": "click_ticket",
        }),

        /**
         * @override
         */
        init: function() {
            this._super.apply(this, arguments);
            this.tickets = [];
        },

        /**
         * @override
         */
        show: function(options) {
            this.tickets = [];
            if (options.event) {
                this.tickets = options.event.event_ticket_ids;
            }
            return this._super.apply(this, arguments);
        },

        /**
         * @override
         */
        renderElement: function() {
            this._super.apply(this, arguments);
            if (this.tickets.length) {
                this.renderTickets();
            }
        },

        /**
         * Gets the available places for a given ticket, considering
         * all the ordered quantities in unsaved paid orders + current order.
         *
         * Please note it doesn't refresh seats_available from backend.
         * For a real availability check, see update_and_check_event_availablity.
         *
         * @param {event.ticket} ticket
         * @returns Number of available seats
         */
        getEventTicketSeatsAvailable: function(ticket) {
            const event = ticket.event_id;
            // No need to compute anything in this case
            if (
                ticket.seats_availability === "unlimited" &&
                event.seats_availability === "unlimited"
            ) {
                return Infinity;
            }
            // Ordered quantities
            const orderedByTicketID = this.pos.get_ordered_event_tickets();
            const orderedByEventID = Object.keys(orderedByTicketID).reduce(
                (map, ticket_id) => {
                    const ticket = this.pos.db.get_event_ticket_by_id(ticket_id);
                    map[ticket.event_id.id] = map[ticket.event_id.id] || 0;
                    map[ticket.event_id.id] += orderedByTicketID[ticket_id];
                    return map;
                },
                {}
            );
            // Compute availability
            const ticketSeatsAvailable =
                ticket.seats_available - (orderedByTicketID[ticket.id] || 0);
            const eventSeatsAvailable =
                event.seats_available - (orderedByEventID[event.id] || 0);
            return Math.min(ticketSeatsAvailable, eventSeatsAvailable);
        },

        getProductImageURL: function(product_id) {
            return (
                window.location.origin +
                "/web/image?model=product.product&field=image_128&id=" +
                product_id
            );
        },

        renderTickets: function() {
            const $ticketsList = this.$(".product-list");
            $ticketsList.empty();
            for (const ticket of this.tickets) {
                $ticketsList.append(
                    QWeb.render("EventTicketListItem", {
                        widget: this,
                        ticket: ticket,
                        product: this.pos.db.get_product_by_id(ticket.product_id[0]),
                        image_url: this.getProductImageURL(ticket.product_id[0]),
                        seats_available: this.getEventTicketSeatsAvailable(ticket),
                    })
                );
            }
        },

        click_ticket: function(ev) {
            const $el = $(ev.currentTarget);
            const ticket_id = $el.data("id");
            const ticket = this.pos.db.get_event_ticket_by_id(ticket_id);
            const product = this.pos.db.get_product_by_id(ticket.product_id[0]);
            this.pos.get_order().add_product(product, {
                quantity: 1,
                price: ticket.price,
                extras: {
                    event_ticket_id: ticket.id,
                    price_manually_set: true,
                },
            });
            // Render tickets, to update availabilities
            this.renderTickets();
        },
    });

    gui.define_popup({name: "event-tickets", widget: EventTicketsPopup});

    return EventTicketsPopup;
});
