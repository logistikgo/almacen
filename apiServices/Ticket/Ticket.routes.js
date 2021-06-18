const { Router } = require('express');
const router = new Router();

const Ticket = require('./Ticket.controller');

//Tickets
router.post('/api/saveTicket', Ticket.post);
router.post('/api/getTickets', Ticket.get);
router.get('/api/getTicketByID', Ticket.getByID);
router.post('/api/aprobarTicket', Ticket.liberarTicket);

module.exports = router;
