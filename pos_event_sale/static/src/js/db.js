/*
Copyright 2021 Camptocamp SA - Iván Todorovich
License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
*/

odoo.define("pos_event_sale.db", function(require) {
    "use strict";

    const PosDB = require("point_of_sale.DB");
    const rpc = require("web.rpc");

    PosDB.include({
        /**
         * @override
         */
        init: function() {
            this._super.apply(this, arguments);
            this.events = [];
            this.event_by_id = {};
            this.event_ticket_by_id = {};
            this.event_ticket_by_product_id = {};
        },

        /**
         * Adds or updates events loaded in the PoS.
         * This method is called on startup, and when updating the event availability.
         * It keeps access map up-to-date, and computes some fields.
         */
        add_events: function(events) {
            if (!events instanceof Array) {
                events = [events];
            }
            for (const event of events) {
                // Convert dates to moment()
                if (event.date_begin) {
                    event.date_begin = moment.utc(event.date_begin).toDate();
                }
                if (event.date_end) {
                    event.date_end = moment.utc(event.date_end).toDate();
                }
                // Sanitize seats_available and seats_max for unlimited events
                // This avoids checking for seats_availability every time.
                if (event.seats_availability == "unlimited") {
                    event.seats_max = Infinity;
                    event.seats_available = Infinity;
                }
                // Add or update local record
                // Use object.assign to update current Object, if it already exists
                if (this.event_by_id[event.id]) {
                    Object.assign(this.event_by_id[event.id], event);
                } else {
                    this.event_by_id[event.id] = event;
                    this.events.push(event);
                }
            }
        },

        add_event_tickets: function(tickets) {
            if (!tickets instanceof Array) {
                tickets = [tickets];
            }
            for (const ticket of tickets) {
                // Sanitize seats_available and seats_max for unlimited tickets
                // This avoids checking for seats_availability every time.
                if (ticket.seats_availability == "unlimited") {
                    ticket.seats_max = Infinity;
                    ticket.seats_available = Infinity;
                }
                // Add or update local record
                // Use object.assign to update current Object, if it already exists
                if (this.event_ticket_by_id[ticket.id]) {
                    Object.assign(this.event_ticket_by_id[ticket.id], ticket);
                } else {
                    this.event_ticket_by_id[ticket.id] = ticket;
                    // Map event ticket by product id
                    if (
                        this.event_ticket_by_product_id[ticket.product_id[0]] ===
                        undefined
                    ) {
                        this.event_ticket_by_product_id[ticket.product_id[0]] = [];
                    }
                    this.event_ticket_by_product_id[ticket.product_id[0]].push(ticket);
                    // Enrich event_id and create circular reference
                    const event = this.get_event_by_id(ticket.event_id[0]);
                    if (event) {
                        event.event_ticket_ids = event.event_ticket_ids || [];
                        event.event_ticket_ids.push(ticket);
                        ticket.event_id = event;
                    }
                }
            }
        },

        get_event_by_id: function(id) {
            return this.event_by_id[id];
        },

        get_event_ticket_by_id: function(id) {
            return this.event_ticket_by_id[id];
        },

        get_events_by_product_id: function(product_id) {
            const tickets = this.get_event_tickets_by_product_id(product_id);
            return _.unique(tickets.map(ticket => ticket.event_id));
        },

        get_event_tickets_by_product_id: function(product_id) {
            return this.event_ticket_by_product_id[product_id] || [];
        },

        /**
         * @returns List of event.event fields to read during availability checks.
         */
        _seats_available_update_fields_event_event: function() {
            return ["id", "seats_availability", "seats_available"];
        },

        /**
         * @returns List of event.event.ticket fields to read during availability checks.
         */
        _seats_available_update_fields_event_ticket: function() {
            return ["id", "seats_availability", "seats_available"];
        },

        /**
         * Updates the event seats_available fields from the backend.
         * Updates both event.event and their related event.ticket records.
         *
         * @param {Array} event_ids
         * @param {Object} options passed to rpc.query. Optional
         * @returns A promise
         */
        update_event_seats_available: function(event_ids, options) {
            // Update event.event seats_available
            const d1 = rpc
                .query(
                    {
                        model: "event.event",
                        method: "search_read",
                        args: [
                            [["id", "in", event_ids]],
                            this._seats_available_update_fields_event_event(),
                        ],
                    },
                    options
                )
                .then(events => this.add_events(events));
            // Update event.event.ticket seats_available
            const d2 = rpc
                .query(
                    {
                        model: "event.event.ticket",
                        method: "search_read",
                        args: [
                            [["event_id", "in", event_ids]],
                            this._seats_available_update_fields_event_ticket(),
                        ],
                    },
                    options
                )
                .then(tickets => this.add_event_tickets(tickets));
            // Resolve when both finish
            return Promise.all([d1, d2]);
        },
    });

    return PosDB;
});
