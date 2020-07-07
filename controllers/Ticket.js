'use strict'

const Ticket = require('../models/Ticket');
const Partida = require('../models/Partida');

function post(req, res) {
    let nTicket = new Ticket(req.body ? req.body : req);
    let command = req.body.commandName;
    let resTicket = null;
    //console.log(nTicket);
    switch(command) {
        case 'MODIFICAR':
            Partida.updateOne({_id: nTicket.partida_id}, { $set: { "isExtraordinaria": true} }).exec();
            break;
        case 'OMITIR':
            Partida.updateOne({_id: nTicket.partida_id}, { $set: { "isExtraordinaria": true, status: "NO_DISPONIBLE"} }).exec();
            break;
    }

    nTicket.save().then((ticket) => {
        //console.log(ticket._id);
        resTicket = ticket;
        res.status(200).send(resTicket);
    });
}

function getByEntrada(req, res) {
    let _id = req.query.entrada_id;

    Ticket.findOne({entrada_id: _id}).then((tickets) => {
        res.status(200).send(tickets);
    })
}

module.exports = {
    post,
    getByEntrada
}