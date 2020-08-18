'use strict'

const Ticket = require('../models/Ticket');
const Partida = require('../models/Partida');
const Helper = require('../helpers');
const Entrada = require('../models/Entrada');
const Posicion = require('../models/Posicion');
const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto');

function getNextID() {
	return Helper.getNextID(Ticket, "idTicket");
}

async function post(req, res) {
    let command = req.body.tipo;
    let resTicket = null;
    //console.log(req.body);
    console.log("tickets");
    let nTicket = new Ticket(req.body ? req.body : req);
   // console.log(nTicket);
    nTicket.fechaAlta = new Date(Date.now()-(5*3600000));
    nTicket.idTicket = await getNextID();
    nTicket.stringFolio = await Helper.getStringFolio(nTicket.idTicket, nTicket.clienteFiscal_id, false, true);
    nTicket.nombreUsuarioAprueba = null;
    nTicket.usuarioAprueba_id = null;
    nTicket.fechaLiberacion = null;
    console.log("afterid");
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
    let firma_id =  req.body.usuarioAprueba_id;
    let firmaName = req.body.nombreUsuarioAprueba;
    let partida_id = "";
    let accion = "";

    console.log(firma_id);
    console.log(firmaName);

    await Ticket.findOne({_id: _id}).then(async function(ticket) {
        partida_id = ticket.partida_id;

        if(tipo == "AGREGAR") { 
            
            await Partida.updateOne({_id: partida_id}, {$set: { status: "ASIGNADA" }});
        }
        else if(tipo == "MODIFICAR") {
            if(accion == "APROBAR") {
                let producto_idTicket = ticket.producto_id;
                if(producto_idTicket != null) {
                    var partidaTicket = await Partida.findOne({_id: ticket.partida_id});

                    await Posicion.findOne({_id: partidaTicket.posiciones[0].posicion_id}).then(async function (posicion) {
                        await Helper.asyncForEach(posicion.niveles, async function(nivel) {
                            await Helper.asyncForEach(nivel.productos, function (objProd) {
                                if(objProd.producto_id == partidaTicket.producto_id) {
                                    //Considerar el acumulado (varias partidas del mismo producto en la misma posicion)
                                    objProd.producto_id = ticket.producto_id;
                                    objProd.embalajes = ticket.embalajesEntrada;
                                    console.log(posicion);
                                    //posicion.save();
                                }
                            });
                        });
                    });

                    await MovimientoInventario.findOne({entrada_id: ticket.entrada_id}).then(movimiento => {
                        movimiento.producto_id = ticket.producto_id;
                        movimiento.embalajes = ticket.embalajesEntrada;
                        //movimiento.save();
                    });

                    await Producto.findOne({_id: producto_id}).then(prod => {
                        prod
                    });
                }
                else {

                }
                await Partida.updateOne({_id: partida_id}, {$set: params});
            }
            else {
                //
            }
            
            
            
        }
        else if(tipo == "OMITIR") {
            console.log(tipo);
            Entrada.findOne({_id: ticket.entrada_id}).then(async function (entrada){
                let arrPartidas = entrada.partidas;
                let partidaIndex = arrPartidas.findIndex(x => x.toString() == partida_id);
                if(partidaIndex != -1) {
                    arrPartidas.splice(partidaIndex, 1);
                }
                entrada.partidas = arrPartidas;
                entrada.save();

                await Partida.deleteOne({_id: partida_id});
            });
        }
        await Ticket.updateOne({ _id: _id }, { $set: { status: "APROBADO", usuarioAprueba_id: firma_id, nombreUsuarioAprueba: firmaName, fechaLiberacion: new Date(Date.now()-(5*3600000)) } })
        .then(ticket => {
            res.status(200).send(ticket);
        });
    });
}

module.exports = {
    post,
    get,
    getByID,
    liberarTicket
}