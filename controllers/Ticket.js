'use strict'

const Ticket = require('../models/Ticket');
const Partida = require('../models/Partida');
const Helper = require('../helpers');

function getNextID() {
	return Helper.getNextID(Ticket, "idTicket");
}

async function post(req, res) {
    let command = req.body.tipo;
    let resTicket = null;
    console.log(req.body);
    let nTicket = new Ticket(req.body ? req.body : req);
    nTicket.fechaAlta = new Date(Date.now()-(5*3600000));
    nTicket.idTicket = await getNextID();
    nTicket.stringFolio = await Helper.getStringFolio(nTicket.idTicket, nTicket.clienteFiscal_id, false, true);

    console.log(nTicket);
    switch(command) {
        case 'MODIFICAR':
            Partida.updateOne({_id: nTicket.partida_id}, { $set: { "isExtraordinaria": true, tipo: "MODIFICADA"} }).exec();
            break;
        case 'OMITIR':
            Partida.updateOne({_id: nTicket.partida_id}, { $set: { "isExtraordinaria": true, tipo: "OMITIR"} }).exec();
            break;
    }

    nTicket.save().then((ticket) => {
        console.log(ticket._id);
        resTicket = ticket;
        res.status(200).send(resTicket);
    });
}

function get(req, res) {
    console.log(req);
    let almacen_id = req.body.almacen_id;
    let sucursal_id = req.body.sucursal_id;
    let clienteFiscal_id = req.body.clienteFiscal_id;

    var filter = {
        almacen_id: almacen_id,
        sucursal_id: sucursal_id,
        clienteFiscal_id: clienteFiscal_id
    }

    Ticket.find(filter)
    .populate({
        path: 'entrada_id',
        model: 'Entrada',
        select: 'stringFolio'
    })
    .populate({
        path: 'salida_id',
        model: 'Salida',
        select: 'stringFolio'
    })
    .then((tickets) => {
        res.status(200).send(tickets);
    })
}

module.exports = {
    post,
    get
}