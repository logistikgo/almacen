'use strict'
const mongoose = require('mongoose');
const Entrada = require('../../Entradas/Entrada.model');
const Producto = require('../../Producto/Producto.model');
const ProdcutoController = require('../../Producto/Producto.controller');
const Partida = require('../../Partida/Partida.controller');
const PartidaModel = require('../../Partida/Partida.model');
const Helper = require('../../../services/utils/helpers');
const MovimientoInventarioModel = require('../../MovimientosInventario/MovimientoInventario.model');
const dateFormat = require('dateformat');
const Pasillo = require('../../Pasillos/Pasillo.model');
const Posicion = require('../../Posicion/Posicion.model');

const { formatPosicion, createDateForForPartida, separarResponsePorLicencia, isEntradaAlreadyCreated } = require('../utils/helpers')
const { movimientosEntradasMirage } = require('../utils/MirageRequest.repository');
const EntradaModel = require('../../Entradas/Entrada.model');
const ProductoModel = require('../../Producto/Producto.model');
const mailer = require('../../../services/email/mailer');
const bodyMailTemplate = require('../../../services/email/templateCreator');
const cheerio = require('cheerio');


async function salidaMirageHandHeld(req, res){


    return res.send({statusCode: 200});

}


module.exports = {
    salidaMirageHandHeld
}