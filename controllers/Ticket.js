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
    //console.log(req.body);
    let nTicket = new Ticket(req.body ? req.body : req);
    nTicket.fechaAlta = new Date(Date.now()-(5*3600000));
    nTicket.idTicket = await getNextID();
    nTicket.stringFolio = await Helper.getStringFolio(nTicket.idTicket, nTicket.clienteFiscal_id, false, true);

    //console.log(nTicket);
    switch(command) {
        case 'MODIFICAR':
            Partida.updateOne({_id: nTicket.partida_id}, { $set: { "isExtraordinaria": true, tipo: "MODIFICADA"} }).exec();
            break;
        case 'OMITIR':
            Partida.updateOne({_id: nTicket.partida_id}, { $set: { "isExtraordinaria": true, tipo: "OMITIR"} }).exec();
            break;
    }

    nTicket.save().then((ticket) => {
        //console.log(ticket._id);
        resTicket = ticket;
        res.status(200).send(resTicket);
    });
    
}

function get(req, res) {
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

function getByID(req, res) {
    let idTicket = req.query.ticket_id;

    Ticket.findOne({ _id: idTicket })
    .populate({
        path: "entrada_id",
        model: "Entrada",
        select: "stringFolio"
    })
    .populate({
        path: "producto_id",
        model: "Producto",
        select: "clave descripcion"
    })
    .populate({
        path: "partida_id",
        model: "Partida",
        select: "clave descripcion embalajesEntrada fechaCaducidad lote"
    })
    .then((ticket)=> {
        console.log(ticket);
        res.status(200).send(ticket);
    })
}

async function liberarTicket(req, res) {
    let tipo = req.body.tipo;
    let _id = req.body.ticket_id;
    let partida_id = "";

    await Ticket.findOne({_id: _id}).then(async function(ticket) {
        partida_id = ticket.partida_id;

        let params = {
            status: "ASIGNADA",
            lote: ticket.lote,
            fechaCaducidad: ticket.fechaCaducidad,
            fechaProduccion: ticket.fechaProduccion,
            producto_id: ticket.producto_id,
            descripcion: ticket.descripcion,
            clave: ticket.clave,
            embalajesEntrada: ticket.embalajesEntrada
        };

        if(tipo == "AGREGAR"){ 
            await Partida.updateOne({_id: partida_id}, {$set: { status: "ASIGNADA" }});
        }
        else if(tipo == "MODIFICAR") {
            await Partida.updateOne({_id: partida_id}, {$set: params});
            
        }
        else if(tipo == "OMITIR") {
            await Partida.updateOne({_id: partida_id}, {$set: { status: "ASIGNADA" }});
        }
        await Ticket.updateOne({ _id: _id }, { $set: { estatus: "APROBADO" } });
    });
}

module.exports = {
    post,
    get,
    getByID,
    liberarTicket
}