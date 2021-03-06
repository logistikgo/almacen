'use strict'
const mongoose = require('mongoose');
const Partida = require('../models/Partida');
const Salida = require('../models/Salida');
const Entrada = require('../models/Entrada');
const Pasillo = require('../models/Pasillo');
const Producto = require('../models/Producto');
const Posicion = require('./Posicion');
const Embalaje = require('../models/Embalaje');
const PosicionModelo = require('../models/Posicion');
const MovimientoInventarioController = require('./MovimientoInventario');
const Helper = require('../helpers');
const NullParamsException = { error: "NullParamsException" };
const BreakException = { info: "Break" };
const dateFormat = require('dateformat');
const EmbalajesController = require('../controllers/Embalaje');
const ClienteFiscal = require('../models/ClienteFiscal');
const ModificacionesModel = require('../models/Modificaciones');
var ObjectId = (require('mongoose').Types.ObjectId);
const Helpers = require('../helpers');

function get(req, res) {
    let encoded_filter = req.params.filtro;
    var buff;
    var data_filter;
    var json_filter;

    try {
        buff = new Buffer(encoded_filter, 'base64');
        data_filter = buff.toString('ascii');

        json_filter = JSON.parse(data_filter);

        Partida.find(json_filter)
            .populate('entrada_id', 'fechaEntrada fechaAlta', 'Entrada')
            .then((partidas) => {
                res.status(200).send(partidas);
            })
            .catch((error) => {
                res.status(500).send(error);
            });
    }
    catch (error) {
        res.status(500).send(error);
    }
}

async function getbyid(req, res)
{
    try{
        let partida_id = req.query.partida_id;
       // console.log(partida_id);
        let partida =await Partida.findOne({ _id:new ObjectId(partida_id)}).exec();
        let productoaux=await Producto.findOne({ _id: new ObjectId(partida.producto_id) }).exec();
        let infoPartida = getInfoPartida(partida);
        infoPartida["productoIsEstiba"]=productoaux.isEstiba;
        infoPartida["embalajesxSalir"] = partida.embalajesxSalir;
        infoPartida["embalajesEntradas"] = partida.embalajesEntrada;
        infoPartida["posiciones"] = partida.posiciones;
           //console.log(partida['productoIsEstiba'])
        
        res.status(200).send(infoPartida);
    }catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
}

async function getByEntrada(req, res) {
    let entrada_id = req.params.entrada_id;

    Partida.find({ entrada_id: entrada_id })
        .populate({
            path: 'producto_id',
            model: 'Producto'
        })
        .then(async (partidas) => {
            //console.log(partidas.length);
            let arrpartida=[];
            await Helper.asyncForEach(partidas, async function (partida) 
            {
                if((partida.tipo=="AGREGADA"||partida.tipo=="MODIFICADA" || partida.tipo=="OUTMODIFICADA"||partida.tipo == "NORMAL") && (partida.status == "ASIGNADA" || partida.status == "WAITINGARRIVAL"))
                {
                    arrpartida.push(partida);
                }
            });
           // console.log(arrpartida.length);
            res.status(200).send(arrpartida);
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send(error);
        });
}

async function getByEntradaSalida(req, res) {
    let entrada_id = req.params.entrada_id;
    
    Partida.find({ entrada_id: entrada_id })
        .then(async (partidas) => {
            //console.log(partidas.length);
            let arrpartida=[];
            await Helper.asyncForEach(partidas, async function (partida) 
            {
                if((partida.tipo=="AGREGADA"||partida.tipo=="MODIFICADA" || partida.tipo=="OUTMODIFICADA"||partida.tipo == "NORMAL")  && partida.status == "ASIGNADA" )
                {
                    arrpartida.push(partida);
                }
            });
            //console.log(arrpartida.length);
            res.status(200).send(arrpartida);
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send(error);
        });
}

async function verificarPartidasSalidas(req, res) {
    let salida_id = req.params.salida_id;
    let salida = await Salida.findOne({ _id: salida_id }).exec();
    let partidas_id = salida.partidas;
    let partidasEmpty = await Partida.find({_id: {$in: partidas_id}, isEmpty: true}).exec();
    let partidasAElminar = partidasEmpty.map(partida => partida._id.toString());

    res.status(200).send({body:partidasAElminar, statusCode: 200});
}

async function getBySalida(req, res) {
    let salida_id = req.params.salida_id;
    let salida = await Salida.findOne({ _id: salida_id }).exec();
    let partidas_id = salida.partidas;
    let referenciaPedido = salida.referencia;
    let partidas = [];
    let partidasAEliminar = [];
    
    await Helper.asyncForEach(partidas_id, async function (partida_id) {
        let partidaFound = await Partida.findOne({ _id: partida_id }).populate({
            path: "producto_id",
            model: "Producto"
        }).exec();
        
        let partida = JSON.parse(JSON.stringify(partidaFound));
        let salida_idFound = partida.salidas_id.find(x => x.salida_id.toString() == salida_id.toString());
        partida.pesoBrutoEnSalida = salida_idFound?salida_idFound.pesoBruto:0;
        partida.pesoNetoEnSalida = salida_idFound?salida_idFound.pesoNeto:0;
        partida.embalajesEnSalida = salida_idFound?salida_idFound.embalajes:0;
        partida.referenciaSalida = referenciaPedido;
        partidas.push(partida);
    });


    res.status(200).send(partidas);
}

function getBySalidaConIDCarga(req, res) {
    let salida_id = req.params.salida_id;
    let campoOrderIDCarga = req.query.campoOrderIDCarga;
    let tipoOrderIDCarga = req.query.tipoOrderIDCarga;

    Salida.findOne({ _id: salida_id })
        .populate({
            path: 'partidas',
            model: 'Partida'
        })
        .then(async (salida) => {
            let partidas = salida.partidas;
            let resPartidas = [];
            let i = 1;

            if (campoOrderIDCarga != undefined && tipoOrderIDCarga != undefined) {
                partidas.sort(function (a, b) {
                    if (a[campoOrderIDCarga] > b[campoOrderIDCarga])
                        return 1;
                    if (a[campoOrderIDCarga] < b[campoOrderIDCarga])
                        return -1;
                    return 0;
                });

                if (tipoOrderIDCarga == -1)
                    partidas.reverse();
            }

            await Helper.asyncForEach(partidas, async function (partida) {
                if (campoOrderIDCarga != undefined && tipoOrderIDCarga != undefined) {
                    partida.posicionCarga = i;
                    resPartidas.push(partida);
                    i++;
                }
                else
                    if (partida.posicionCarga !== undefined)
                        resPartidas.push(partida);
            });

            res.status(200).send(resPartidas);
        });
}

async function saveIDCarga(req, res){
    let partidas = req.body.partidas;
    //console.log(partidas);
    let resPartidas = [];

    await Helper.asyncForEach(partidas, async function (partida) {
        await Partida.updateOne({ _id: partida._id }, { $set: { posicionCarga: partida.posicionCarga} }).exec();
        resPartidas.push(partida);
    });

    res.status(200).send(resPartidas);
}

/* Guarda para cada partida, las cantidades restantes y updatea la Entrada isEmpty a true
si todas las partidas estan vacias */
async function put(arrPartidas, salida_id) {
    var arrPartidas_id = [];
    let entradas_id = arrPartidas.length > 0 ? arrPartidas.map(x => x.entrada_id) : undefined;
    console.log(arrPartidas);
    await Helper.asyncForEach(arrPartidas, async function (partida) {
        arrPartidas_id.push(partida._id);
        let jsonSalida_id = {
            salida_id: salida_id,
            embalajes: partida.embalajesEnSalida,
            salidaxPosiciones: partida.embalajesEnSalidaxPosicion
        };

        let partidaFound = await Partida.findOne({ _id: partida._id });

        if (partidaFound) {
            partidaFound.salidas_id.push(jsonSalida_id);

            if(partida.isEmpty){
                partida.posiciones[0].isEmpty = true;
                partida.posiciones[0].embalajesxSalir.cajas = 0;
            }

            let changes = {
                salidas_id: partidaFound.salidas_id,
                embalajesxSalir: partida.embalajesxSalir,
                posiciones: partida.posiciones,
                isEmpty: partida.isEmpty
            };

            if (partidaFound.embalajesAlmacen != undefined) {
                for (let x in partidaFound.embalajesAlmacen) {
                    //console.log(partidaFound.embalajesAlmacen +" - "+partida.embalajesEnSalida[x] );
                    partidaFound.embalajesAlmacen[x] -= partida.embalajesEnSalida[x];
                }
                changes['embalajesAlmacen'] = partidaFound.embalajesAlmacen;
            }

            changes.posiciones[0].embalajesxSalir.cajas = partida.embalajesxSalir.cajas;
            
            await Partida.updateOne({ _id: partidaFound._id }, { $set: changes }).exec();
        }

    });

    Helper.asyncForEach(entradas_id, async function (entrada_id) {
        await setIsEmptyEntrada(entrada_id);
    });

    return arrPartidas_id;
}

async function post(arrPartidas, entrada_id) {
    var arrPartidas_id = [];
    //console.log("adssssssssssssssssssssssssssssssssssssssssssssssss");
    await Helper.asyncForEach(arrPartidas, async function (partida) {
        //console.log(partida);
        if(!("_id" in partida)){
            //console.log("introooooooooooooooooooooooo");
            let nPartida = new Partida(partida);
            nPartida.entrada_id = entrada_id;
            await nPartida.save().then((partida) => {
                arrPartidas_id.push(partida._id);
            });
        }

    });
    //console.log("ENNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNDDDDDDDDDDDDD");
    return arrPartidas_id;
}

/* Para todas las partidas donde InfoPedidos.IDPedido se incluya en arrIDPedidos
 Obtiene la informacion de los embalajes y las posiciones que salieron para cada Pedido procedente del
 atributo InfoPedidos. Obtiene el total de embalajes que salieron y las posiciones para agregar 
 un nuevo elemento al atributo salidas_id. */
async function updateForSalidaAutomatica(partidas, arrIDPedidos, salida_id) {
    let partidasEdited = [];
    await Helper.asyncForEach(partidas, async function (partida) {
        let infoPedidosActual = partida.InfoPedidos.filter(x => arrIDPedidos.includes(x.IDPedido) && x.status == "PENDIENTE");

        let embalajesTotales = {};
        let embalajesxPosicion = [];

        //Obtiene los embalajes totales
        infoPedidosActual.forEach(function (infoPedido) {
            infoPedido.status = "COMPLETO";

            if (partida.status != "SELECCIONADA") {
                infoPedido.embalajesEnSalidasxPosicion = [];
                partida.posiciones.forEach(posicion => {
                    let embalajesxPosicionCurrent = {
                        embalajes: posicion.embalajesxSalir,
                        posicion_id: posicion.posicion_id,
                        posicion: posicion.posicion,
                        pasillo_id: posicion.pasillo_id,
                        pasillo: posicion.pasillo,
                        nivel_id: posicion.nivel_id,
                        nivel: posicion.nivel
                    };
                    infoPedido.embalajesEnSalidasxPosicion.push(embalajesxPosicionCurrent);
                });
            }

            embalajesxPosicion = embalajesxPosicion.concat(infoPedido.embalajesEnSalidasxPosicion);
            for (let x in infoPedido.embalajes) {
                if (embalajesTotales[x] == undefined) embalajesTotales[x] = 0;
                embalajesTotales[x] += infoPedido.embalajes[x];
            }
        });

        //Obtiene las posiciones y agrupa las posiciones iguales. 
        //El caso en donde se hicieron más de un Pedido y la posicion implicada fue la misma
        let ubicacionesDistintas = [];
        let posicionesDistintas = [];
        embalajesxPosicion.forEach(function (element) {
            element.ubicacion = element.pasillo + element.posicion + element.nivel;
            ubicacionesDistintas.push(element.ubicacion);
            ubicacionesDistintas = ubicacionesDistintas.filter(Helper.distinct);
        });

        ubicacionesDistintas.forEach(function (ubicacion) {
            let posiciones = embalajesxPosicion.filter(x => x.ubicacion.toString() == ubicacion);
            let posicionFinal = {
                embalajes: {},
                posicion_id: posiciones[0].posicion_id,
                posicion: posiciones[0].posicion,
                pasillo_id: posiciones[0].pasillo_id,
                pasillo: posiciones[0].pasillo,
                nivel_id: posiciones[0].nivel_id,
                nivel: posiciones[0].nivel
            };
            posiciones.forEach(function (posicion) {
                for (let x in posicion.embalajes) {
                    if (posicionFinal.embalajes[x] == undefined) posicionFinal.embalajes[x] = 0;
                    posicionFinal.embalajes[x] += posicion.embalajes[x];
                }
            });
            posicionesDistintas.push(posicionFinal);
        });
        //Nuevo elemento para el atributo salidas_id
        let Jsonsalida_id = {
            salida_id: salida_id, //La salida
            embalajes: embalajesTotales, //Los embalajes totales
            salidaxPosiciones: posicionesDistintas //Las posiciones involucradas de esos embalajes totales
        };

        partida.salidas_id.push(Jsonsalida_id);
        partida.embalajesEnSalida = embalajesTotales;
        partida.embalajesEnSalidaxPosicion = posicionesDistintas;

        //Actualiza embalajesAlmacen
        if (partida.status == "SELECCIONADA") {
            for (let x in partida.embalajesAlmacen) {
                partida.embalajesAlmacen[x] -= embalajesTotales[x];
            }
        }

        //Se debera updatear embalajesxSalir y los embalajes de las posiciones a cero
        if (partida.status != "SELECCIONADA") {
            partida.isEmpty = true;
            for (let x in partida.embalajesxSalir) {
                partida.embalajesxSalir[x] = 0;
            }
            for (let i = 0; i < partida.posiciones.length; i++) {
                partida.posiciones[i].isEmpty = true;
                for (let x in partida.posiciones[i].embalajesxSalir) {
                    partida.posiciones[i].embalajesxSalir[x] = 0;
                }
            }
        }

        let PartidaFound = await Partida.findOne({ _id: partida._id }).exec();

        PartidaFound.salidas_id = partida.salidas_id;
        PartidaFound.InfoPedidos = partida.InfoPedidos;
        if (partida.status == "SELECCIONADA") PartidaFound.embalajesAlmacen = partida.embalajesAlmacen;
        if (partida.status != "SELECCIONADA") PartidaFound.embalajesxSalir = partida.embalajesxSalir;
        if (partida.status != "SELECCIONADA") PartidaFound.posiciones = partida.posiciones;
        if (partida.status != "SELECCIONADA") PartidaFound.isEmpty = partida.isEmpty;


        if (partida.status == "SELECCIONADA" && Helper.Compare(partida.embalajesxSalir, partida.embalajesAlmacen)) {
            delete partida.embalajesAlmacen;
            PartidaFound.embalajesAlmacen = undefined;
        }

        //console.log(PartidaFound);
        await PartidaFound.save();
        partidasEdited.push(partida);
    });

    //Para todas las partidas que fueron editadas, se obtiene el atributo entrada_id
    //Y se ejecuta un distinct para obtener valores unicos, posteriormente se updatean las Entradas a
    //isEmpty = true, en el caso de que todas sus partidas esten vacias.
    let entradas_id = partidasEdited.map(x => x.entrada_id.toString()).filter(Helper.distinct);
    Helper.asyncForEach(entradas_id, async function (entrada_id) {
        await setIsEmptyEntrada(entrada_id);
    });
    return partidasEdited;
}

async function addSalida(salida, _id) {
    await Partida.findOne({ _id: _id }).then((partida) => {
        partida.salidas_id.push(salida);
        partida.save();
    })
        .catch((error) => {
            res.status(500).send(error);
        });
}

async function asignarEntrada(arrPartidas_id, entrada_id) {
    //console.log(arrPartidas_id);
    await Helper.asyncForEach(arrPartidas_id, async function (partida_id) {
        await Partida.updateOne({ _id: partida_id }, { $set: { entrada_id: entrada_id} }).exec();
        //console.log(partida_id);
    });
}

function isEmptyPartida(partida) {
    let contEmbalajesCero = 0;
    let tamEmbalajes = 0;

    for (let embalaje in partida.embalajesxSalir) { tamEmbalajes += 1; } //Se obtiene la cantidad de embalajes
    for (let embalaje in partida.embalajesxSalir) {  //Obtiene la cantidad de embalajes con cero
        if (partida.embalajesxSalir[embalaje] < 1) contEmbalajesCero += 1;
    }

    // Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
    if (tamEmbalajes == contEmbalajesCero)
        return true;
    else
        return false;
}

async function isEmptyPartidas(entrada_id) {
    let partidas = await Partida.find({ entrada_id: entrada_id }).exec();
    let tamPartidas = partidas.length;
    let conPartidasCero = 0;

    partidas.forEach(function (partida) {
        if (isEmptyPartida(partida)) conPartidasCero += 1; //Obtiene la cantidad de partidas en cero
    });

    if (tamPartidas == conPartidasCero) //Si el total de partidas es igual al total de partidas con cero
        return true;
    else
        return false;
}

async function setIsEmptyEntrada(entrada_id) {
    if (entrada_id) {
        let bisEmptyPartidas = await isEmptyPartidas(entrada_id);

        if (bisEmptyPartidas) {
            await Entrada.updateOne({ _id: entrada_id }, { $set: { isEmpty: true, status: "FINALIZADO" } }).exec();
        }
    }
}

/* Obtiene las partidas por SKU, y genera los embalajes que se sacaran dependiendo
de la disponibilidad de los embalajes existentes. */
async function getByProductoEmbalaje(req, res) {
    let producto_id = req.query.producto_id; //Hexa
    let embalaje = req.query.embalaje; //tarimas, piezas
    let embalajesxSalir = "embalajesxSalir." + embalaje; //"embalajesxSalir.tarimas"
    let clienteFiscal_id = req.query.clienteFiscal_id; //He
    let sucursal_id = req.query.sucursal_id;
    let almacen_id = req.query.almacen_id;
    let cantidad = req.query.cantidad;
    let cantidadRestante = parseFloat(cantidad);
    let algoritmoSalida = req.query.algoritmoSalida;
    

    //console.log("test");

    /**
     * Se obtienen las partidas necesarias para la cantidad deseada
     * Se obtienen las partidas que no estan vacias, que tienen existencias por salir
     * del embalaje solicitado y se ordenan de forma ascendente, de la mas antigua a la mas reciente
     * Filtros utilizados: producto_id, isEmpty, clienteFiscal_id, sucursal_id, almacen_id
     *
     */

  
    let partidas = await Partida
        .find({ producto_id: producto_id, isEmpty: false , tipo:{$in: ["NORMAL", "MODIFICADA","AGREGADA"]},status:"ASIGNADA"})
        .populate('entrada_id', 'fechaEntrada clienteFiscal_id sucursal_id almacen_id tipo',
            {
                clienteFiscal_id: clienteFiscal_id,
                sucursal_id: sucursal_id,
                almacen_id: almacen_id
            })
        .populate({
            path: 'producto_id',
            model: 'Producto'
            })
        .where(embalajesxSalir).gt(0)
        .exec();
        
    //var testPartidas=[];
    partidas = partidas.filter(x => x.tipo == "EXISTENCIA_INICIAL" || (x.entrada_id != undefined && x.entrada_id.clienteFiscal_id == clienteFiscal_id && x.entrada_id.sucursal_id == sucursal_id && x.entrada_id.almacen_id == almacen_id));
    //console.log(partidas);

    //console.log(algoritmoSalida);
    if (algoritmoSalida !== undefined && algoritmoSalida.length > 0) {
        //Ordena por prioridad apor prioridad los algoritmos
        algoritmoSalida.sort(function (a, b) {
            if (a.prioridad > b.prioridad) return 1;
            else if (a.prioridad < b.prioridad) return -1;
            return 0;
        });

        //Ordena las partidas dependiendo del algoritmo
        if (algoritmoSalida[0].algoritmo === "PEPS")
            partidas = partidas.sort(async function (a, b) {
                if (new Date(a.entrada_id.fechaEntrada) < new Date(b.entrada_id.fechaEntrada)) return -1;
                if (new Date(a.entrada_id.fechaEntrada) > new Date(b.entrada_id.fechaEntrada)) return 1;
                else {
                    if (algoritmoSalida.length > 1) {
                        if (algoritmoSalida[1].algoritmo === "CADUCIDAD") {
                            let prodA=await Producto.findOne({ _id: a.producto_id });
                            let fechaA = new Date(a.fechaCaducidad - (prodA.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
                            let prodB=await Producto.findOne({ _id: b.producto_id });
                            let fechaB = new Date(b.fechaCaducidad - (prodB.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
                            
                            if (new Date(fechaA) < new Date(fechaB)) return -1;
                            else if (new Date(fechaA) > new Date(fechaB)) return 1;
                        }
                    }
                    return 0;
                }
            });
        else if (algoritmoSalida[0].algoritmo === "CADUCIDAD")
            partidas = partidas.sort( function (a, b) {
                let fechaA = a.fechaCaducidad;
                let fechaB = b.fechaCaducidad;
                
                if (new Date(fechaA) < new Date(fechaB)) return -1;
                if (new Date(fechaA) > new Date(fechaB)) return 1;
                else {
                    if (algoritmoSalida.length > 1) {
                        if (algoritmoSalida[1].algoritmo === "PEPS") {
                            if (new Date(a.entrada_id.fechaEntrada) < new Date(b.entrada_id.fechaEntrada)) return -1;
                            else if (new Date(a.entrada_id.fechaEntrada) > new Date(b.entrada_id.fechaEntrada)) return 1;
                        }
                    }
                    return 0;
                }
            });
    }
    //console.log(partidas);
    let partidasActuales = [];

    try {
        //Validacion para Clientes fiscales que no utilicen ningun algoritmo
        //console.log(algoritmoSalida === undefined || algoritmoSalida.length < 1);
        if (algoritmoSalida === undefined || algoritmoSalida.length < 1) {
            partidas.forEach(partida => {
                let subConsecutivo = 0;
                //console.log("Posiciones", partida.posiciones.filter(x => !x.isEmpty));
                partida.posiciones.filter(x => !x.isEmpty).forEach(posicion => {
                   // console.log("Posicion n", posicion.nivel)
                    let auxPartida = {
                        lote: partida.lote,
                        clave: partida.clave,
                        descripcion: partida.descripcion,
                        fechaCaducidad: partida.fechaCaducidad ? partida.fechaCaducidad : "",
                        isEmpty: partida.isEmpty,
                        _id: partida._id,
                        _idLocal: partida._id + '/' + subConsecutivo,
                        embalajesEntradaFull: Helper.Clone(partida.embalajesEntrada),
                        embalajesxSalirFull: Helper.Clone(partida.embalajesxSalir),
                        embalajesEntrada: Helper.Clone(posicion.embalajesxSalir),
                        embalajesxSalir: Helper.Clone(posicion.embalajesxSalir),
                        embalajesEnSalida: Helper.emptyEmbalajes(posicion.embalajesxSalir),
                        posicion_id: posicion.posicion_id,
                        posicion: posicion.posicion,
                        pasillo_id: posicion.pasillo_id,
                        pasillo: posicion.pasillo,
                        nivel_id: posicion.nivel_id,
                        nivel: posicion.nivel,
                        producto_id: partida.producto_id,
                        ubicacion_id: posicion._id,
                        origen:partida.origen, 
                        pedido:partida.pedido,
                        refpedido:partida.refpedido,
                        referenciaPedidos: partida.referenciaPedidos,
                        saneado:partida.saneado,
                        posicionesFull: Helper.Clone(partida.posiciones),
                        posiciones: [partida.posiciones.find(x => x._id.toString() === posicion._id.toString())],
                        subConsecutivo: subConsecutivo,
                        fechaEntrada: partida.entrada_id != undefined ? partida.entrada_id.fechaEntrada : "",
                        entrada_id: partida.entrada_id != undefined ? partida.entrada_id._id : "",
                        tipoentrada: partida.entrada_id != undefined ? partida.entrada_id.tipo : ""
                    };
                    //console.log(auxPartida);
                    subConsecutivo += 1;
                    //var band = true;
                   /* if("tarimas" in auxPartida.embalajesxSalir)
                    {
                        if(auxPartida.embalajesxSalir.tarimas<1)
                            band=false;
                        else
                            band=true;
                    }
                    if("cajas" in auxPartida.embalajesxSalir)
                    {
                        if(auxPartida.embalajesxSalir.cajas<1)
                            band=false;
                        else
                            band=true;
                    }
                    if("piezas" in auxPartida.embalajesxSalir)
                    {
                        if(auxPartida.embalajesxSalir.piezas<1)
                            band=false;
                        else
                            band=true;
                    }
                    console.log("end");*/
                    //if(band==true)
                    if(auxPartida.tipoentrada == "NORMAL" || auxPartida.tipoentrada == "TRANSFERENCIA")
                    partidasActuales.push(auxPartida);
                });
            });

            throw BreakException;
        }

        /**
         * Se obtienen las partidas por posicion, y se determina la cantidad de salida
         * del embalaje para cada posicion, dependiendo de su disponibilidad
         */

        //console.log("Cantidad restante", cantidadRestante);
        await Helper.asyncForEach(partidas, async function (partida) {
            let prodA=await Producto.findOne({ _id: partida.producto_id });
             //console.log(prodA.garantiaFrescura)
            let fechaA=Date.now();
            if(prodA.garantiaFrescura)
                fechaA = new Date(partida.fechaCaducidad - (prodA.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
          //  console.log(partida.embalajesxSalir[embalaje]+"=="+partida.embalajesEntrada[embalaje]);
            if(algoritmoSalida[0].algoritmo === "CADUCIDAD" && Date.now()<fechaA && partida.embalajesxSalir[embalaje]==partida.embalajesEntrada[embalaje]){
                let subConsecutivo = 0;
                //console.log(dateFormat(fechaA, "dd/mm/yyyy"));
                partida.posiciones.filter(x => !x.isEmpty).forEach(posicion => {

                    if (cantidadRestante > 0) {
                        let auxPartida = {
                            lote: partida.lote,
                            clave: partida.clave,
                            descripcion: partida.descripcion,
                            isEmpty: partida.isEmpty,
                            _id: partida._id,
                            _idLocal: partida._id + '/' + subConsecutivo,
                            embalajesEntradaFull: Helper.Clone(partida.embalajesEntrada),
                            embalajesxSalirFull: Helper.Clone(partida.embalajesxSalir),
                            embalajesEntrada: Helper.Clone(posicion.embalajesxSalir),
                            embalajesxSalir: Helper.Clone(posicion.embalajesxSalir),
                            embalajesEnSalida: Helper.emptyEmbalajes(posicion.embalajesxSalir),
                            posicion_id: posicion.posicion_id,
                            posicion: posicion.posicion,
                            pasillo_id: posicion.pasillo_id,
                            pasillo: posicion.pasillo,
                            nivel_id: posicion.nivel_id,
                            nivel: posicion.nivel,
                            producto_id: partida.producto_id,
                            ubicacion_id: posicion._id,
                            posicionesFull: Helper.Clone(partida.posiciones),
                            origen:partida.origen,
                            pedido:partida.pedido,
                            refpedido:partida.refpedido,
                            referenciaPedidos: partida.referenciaPedidos,
                            saneado:partida.saneado,
                            posiciones: [partida.posiciones.find(x => x._id.toString() === posicion._id.toString())],
                            subConsecutivo: subConsecutivo,
                            fechaEntrada: partida.entrada_id != undefined ? partida.entrada_id.fechaEntrada : "",
                            fechaCaducidad: partida.fechaCaducidad ? partida.fechaCaducidad : "",
                            entrada_id: partida.entrada_id != undefined ? partida.entrada_id._id : ""
                        };

                        if (cantidadRestante >= auxPartida.embalajesxSalir[embalaje]) {
                            auxPartida.embalajesEnSalida[embalaje] = auxPartida.embalajesxSalir[embalaje];
                            auxPartida.embalajesxSalir[embalaje] = 0;
                            auxPartida.posiciones[0].embalajesxSalir[embalaje] = 0;
                            auxPartida.posiciones[0].isEmpty = Helper.isEmptyEmbalaje(auxPartida.posiciones[0].embalajesxSalir);

                        } else {

                            auxPartida.embalajesEnSalida[embalaje] = cantidadRestante;
                            auxPartida.embalajesxSalir[embalaje] -= cantidadRestante;
                            auxPartida.posiciones[0].embalajesxSalir[embalaje] -= cantidadRestante;
                        }

                        subConsecutivo += 1;
                        partidasActuales.push(auxPartida);
                        cantidadRestante -= auxPartida.embalajesEnSalida[embalaje];
                    } else {
                        //Si no hay mas que sacar entonces simplemente termina
                        throw BreakException;
                    }
                });
            }
            else if(algoritmoSalida[0].algoritmo != "CADUCIDAD")
            {
                let subConsecutivo = 0;
                //console.log(dateFormat(fechaA, "dd/mm/yyyy"));
                partida.posiciones.filter(x => !x.isEmpty).forEach(posicion => {

                    if (cantidadRestante > 0) {
                        let auxPartida = {
                            lote: partida.lote,
                            clave: partida.clave,
                            descripcion: partida.descripcion,
                            isEmpty: partida.isEmpty,
                            _id: partida._id,
                            _idLocal: partida._id + '/' + subConsecutivo,
                            embalajesEntradaFull: Helper.Clone(partida.embalajesEntrada),
                            embalajesxSalirFull: Helper.Clone(partida.embalajesxSalir),
                            embalajesEntrada: Helper.Clone(posicion.embalajesxSalir),
                            embalajesxSalir: Helper.Clone(posicion.embalajesxSalir),
                            embalajesEnSalida: Helper.emptyEmbalajes(posicion.embalajesxSalir),
                            posicion_id: posicion.posicion_id,
                            posicion: posicion.posicion,
                            pasillo_id: posicion.pasillo_id,
                            pasillo: posicion.pasillo,
                            nivel_id: posicion.nivel_id,
                            nivel: posicion.nivel,
                            producto_id: partida.producto_id,
                            ubicacion_id: posicion._id,
                            posicionesFull: Helper.Clone(partida.posiciones),
                            posiciones: [partida.posiciones.find(x => x._id.toString() === posicion._id.toString())],
                            subConsecutivo: subConsecutivo,
                            origen:partida.origen, 
                            pedido:partida.pedido,
                            refpedido:partida.refpedido,
                            referenciaPedidos: partida.referenciaPedidos,
                            saneado:partida.saneado,
                            fechaEntrada: partida.entrada_id != undefined ? partida.entrada_id.fechaEntrada : "",
                            fechaCaducidad: partida.fechaCaducidad ? partida.fechaCaducidad : "",
                            entrada_id: partida.entrada_id != undefined ? partida.entrada_id._id : ""
                        };

                        if (cantidadRestante >= auxPartida.embalajesxSalir[embalaje]) {
                            auxPartida.embalajesEnSalida[embalaje] = auxPartida.embalajesxSalir[embalaje];
                            auxPartida.embalajesxSalir[embalaje] = 0;
                            auxPartida.posiciones[0].embalajesxSalir[embalaje] = 0;
                            auxPartida.posiciones[0].isEmpty = Helper.isEmptyEmbalaje(auxPartida.posiciones[0].embalajesxSalir);

                        } else {

                            auxPartida.embalajesEnSalida[embalaje] = cantidadRestante;
                            auxPartida.embalajesxSalir[embalaje] -= cantidadRestante;
                            auxPartida.posiciones[0].embalajesxSalir[embalaje] -= cantidadRestante;
                        }

                        subConsecutivo += 1;
                        partidasActuales.push(auxPartida);
                        cantidadRestante -= auxPartida.embalajesEnSalida[embalaje];
                    } else {
                        //Si no hay mas que sacar entonces simplemente termina
                        throw BreakException;
                    }
                });
            }
        });
        //Si los ciclos han terminado entonces se lanza  la excepcion de finalización.
        //Puesto que ya no hay partidas disponibles
        throw BreakException;
    }
    catch (e) {
        if (e == BreakException) {
            res.status(200).send(partidasActuales);
        } else {
            res.status(500).send(e);
        }
    }
}

/* Obtiene las partidas con respecto a los filtros de cliente fiscal, sucursal y almacen. */
async function getPartidasByIDs(req, res) {


    let isFilter = false;

    //Verificar si el reporte contiene filtros
    if(req.query.page === undefined || req.query.limit === undefined)
        isFilter = true;
    
    let pagination = {
        page: parseInt(req.query.page) || 10,
        limit: parseInt(req.query.limit) || 1
    }
    console.log(pagination)
    let arrClientesFiscales_id = req.query.clienteFiscal_id;
    let arrSucursales_id = req.query.sucursal_id;
    let arrAlmacenes_id = req.query.almacen_id;
    let tipo = req.query.tipo;
    let clasificacion = req.query.clasificacion != undefined ? req.query.clasificacion : "";
    let subclasificacion = req.query.subclasificacion != undefined ? req.query.subclasificacion :"";
    let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
    let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
    let fecha=req.query.fecha != undefined ? req.query.fecha : "";
    let folioEntrada=req.query.stringFolioEntrada != undefined ? req.query.stringFolioEntrada : "";
    let folioSalida=req.query.stringFolioSalida != undefined ? req.query.stringFolioSalida : "";
    let clave=req.query.producto_id != undefined ? req.query.producto_id : "";
    let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
    //console.log(req.query);
    try {

        if (arrClientesFiscales_id == undefined ) throw NullParamsException;
        if (arrSucursales_id == undefined ) throw NullParamsException;
        if (arrAlmacenes_id == undefined ) throw NullParamsException;
        if (tipo == undefined || tipo == "") throw NullParamsException;

        let filter = {
            clienteFiscal_id: arrClientesFiscales_id ,
            sucursal_id:  arrSucursales_id ,
            almacen_id: arrAlmacenes_id 
        };
        if(fechaInicio != "" &&  fechaFinal != ""){
            if(fecha == "fechaAltaEntrada")
            {
                filter.fechaAlta={
                    $gte:fechaInicio,
                    $lt: fechaFinal
                };
            }
            if(fecha == "fechaEntrada")
            {
                filter.fechaEntrada={
                    $gte:fechaInicio,
                    $lt: fechaFinal
                };
            }
        }
        if(folioEntrada != "")
        {
            filter.stringFolio=folioEntrada;
        }
        
        let entradas = await Entrada.find(filter).exec();
        
        let entradas_id = entradas.map(x => x._id);
        
        let partidas = [];
        let arrPartidas = [];
        if(isFilter){

            partidas = await Partida
            .find({ entrada_id: { $in: entradas_id } })
            .populate({
                path: "entrada_id",
                model: "Entrada",
                populate: {
                    path: "clienteFiscal_id",
                    model: "ClienteFiscal",
                    select: 'nombreCorto nombreComercial razonSocial fechAlta'
                },
                populate: {
                    path: "sucursal_id",
                    model: "Sucursal",
                    select: 'nombre fechAlta'
                },
                populate: {
                    path: "almacen_id",
                    model: "Almacen",
                    select: 'nombre fechAlta',
                },
                select: 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista fechaAlta tipo'
            })
            .populate({
                path: 'salidas_id.salida_id',
                model: 'Salida',
                select: 'folio stringFolio fechaSalida item embalajes fechaAlta'
            })
            .populate({
                path: 'producto_id',
                model: 'Producto',
            
            })

            partidas.forEach((partida, index) => 
                {
                    
                    //partida.producto_id = partida.producto_id[0];
                    
                    //partida.salidas_id = partida.salida_id[0];
                    /* let partidaObj = JSON.parse(JSON.stringify(partida));
                    let salidas_id = partidaObj.salidas_id;

                    if(salidas_id.length > 0){

                        salidas_id.forEach(salida => {
                            
                            if(salida.hasOwnProperty("salida_id") && salida.salida_id !== null){
                                
                                console.log("Index_Pos: "+ index);
                                console.log("Salida_id: "+salida.salida_id._id);
                                console.log("Partida_id: "+ partida._id.toString());
                                console.log("--------------------------");
                            }else{
                                console.log("Esta salida no tiene referencia: "+ partida._id.toString());
                            }

                        })

                    } */

                    //console.clear();
                    try{
                        //partida.salidas_id[0].salida_id = partida.salidas_id[0];
                        
                        let resFecha=true
                        let resClasificacion=true;
                        let resSubclasificacion=true;
                        let resClave=true;
                        if(fecha == "fechaSalida" && partida.salidas_id != undefined && partida.salidas_id[0] !=undefined)
                        {
                            resFecha = new Date(partida.salidas_id[0].salida_id.fechaSalida)>=new Date(fechaInicio) && new Date(partida.salidas_id[0].salida_id.fechaSalida)<=new Date(fechaFinal);
                        }
                        else
                            if(fecha == "fechaSalida")
                            resFecha = false;
                        if(fecha == "fechaAltaSalida" && partida.salidas_id != undefined && partida.salidas_id[0] !=undefined)
                        {
                            resFecha = new Date(partida.salidas_id[0].salida_id.fechaAlta)>=new Date(fechaInicio) && new Date(partida.salidas_id[0].salida_id.fechaAlta)<=new Date(fechaFinal);
                        }
                        else
                            if(fecha == "fechaAltaSalida")
                                resFecha = false;
                        if(clave != "" && partida.producto_id._id.toString() !== clave.toString())
                        {
                            resClave=false;
                        }
                        if(clasificacion != "")
                        {
                            resClasificacion=partida.producto_id.clasificacion_id.toString() == clasificacion.toString() ;
                        }
                        if(subclasificacion != "")
                        {
                            resSubclasificacion=partida.producto_id.subclasificacion_id.toString() == subclasificacion.toString();
                        }
                        if(resFecha==true && resClasificacion==true && resSubclasificacion ==true && resClave==true && partida.status=="ASIGNADA" && (partida.tipo=="NORMAL" || partida.tipo=="AGREGADA" || partida.tipo=="MODIFICADA" || partida.tipo=="OUTMODIFICADA"))
                            arrPartidas.push(partida);
                        

                    }catch(error){
                        console.log(error);
                    }


                });
    
                res.status(200).send(arrPartidas);

        }else{


            let partidasAggregate = Partida.aggregate([
            
                {$lookup:{ from: "Entradas", localField: "entrada_id", foreignField: "_id", as: "Entradas"}},
                    
                {$lookup:{ from: "ClientesFiscales", localField: "Entradas.clienteFiscal_id", foreignField: "_id", as: "ClientesFiscales"}},
                
                {$lookup:{ from: "Sucursales", localField: "Entradas.sucursal_id", foreignField: "_id", as: "Sucursales"}},
                
                {$lookup:{ from: "Almacenes", localField: "Entradas.almacen_id", foreignField: "_id", as: "Almacenes"}},
                
                {$lookup:{ from: "Salidas", localField: "salidas_id.salida_id", foreignField: "_id", as: "Salidas"}},
                
                {$lookup:{ from: "Productos", localField: "producto_id", foreignField: "_id", as: "Productos"}},
           
            {$match: {entrada_id: {$in: entradas_id}, status: "ASIGNADA"}},
           
            {$project: {
                _id: 1,
                valor: 1,
                isEmpty: 1,
                origen: 1,
                tipo: 1,
                status: 1,
                isExtraordinaria: 1,
                producto_id: "$Productos",
                clave: 1,
                descripcion: 1,
                embalajesEntrada: 1,
                embalajesxSalir: 1,
                fechaProduccion: 1,
                fechaCaducidad: 1,
                lote: 1,
                InfoPedidos: 1,
                //"salidas_id._id": 1,
                //"salidas_id.salidaxPosiciones": 1,
                "salidas_id.salida_id": "$Salidas",
                posiciones: 1,
                __v: 1,
                "Entradas._id": 1,
                "Entradas.fechaAlta": 1,
                "Entradas.fechaEntrada": 1,
                "Entradas.almacen_id": "$Almacenes",
                "Entradas.clienteFiscal_id": 1,
                "Entradas.sucursal_id": 1,
                "Entradas.tipo": 1,
                "Entradas.tracto": 1,
                "Entradas.remolque": 1,
                "Entradas.referencia": 1,
                "Entradas.factura": 1,
                "Entradas.item": 1,
                "Entradas.transportista": 1,
                "Entradas.ordenCompra": 1,
                "Entradas.folio": 1,
                "Entradas.stringFolio": 1,
                "Enradas.recibio": 1
                
             
            }},
            { $sort: { "Entradas[0].fechaEntrada": -1 } }
                   
            ]).allowDiskUse(true);
    
            partidas = await Partida.aggregatePaginate(partidasAggregate, pagination);
            
            partidas.docs.forEach(partida => 
                {
                    partida.entrada_id = partida.Entradas[0];

                     if(partida.salidas_id.length !== 0)
                        partida.salidas_id[0].salida_id = partida.salidas_id[0].salida_id[0];
                    
                        partida.producto_id = partida.producto_id[0];

                    arrPartidas.push(partida);
    
                });
    
                    console.log(arrPartidas.length);
                    partidas.docs = arrPartidas;
                    res.status(200).send(partidas);
                
        }
 
    }
    catch (error) {
        res.status(500).send(error);
    }
}


async function getExcelByIDs(req, res) {
    let arrClientesFiscales_id = req.query.clienteFiscal_id;
    let arrSucursales_id = req.query.sucursal_id;
    let arrAlmacenes_id = req.query.almacen_id;
    let tipo = req.query.tipo;
    let clasificacion = req.query.clasificacion != undefined ? req.query.clasificacion : "";
    let subclasificacion = req.query.subclasificacion != undefined ? req.query.subclasificacion :"";
    let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
    let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
    let fecha=req.query.fecha != undefined ? req.query.fecha : "";
    let folioEntrada=req.query.stringFolioEntrada != undefined ? req.query.stringFolioEntrada : "";
    let folioSalida=req.query.stringFolioSalida != undefined ? req.query.stringFolioSalida : "";
    let clave=req.query.producto_id != undefined ? req.query.producto_id : "";
    let folio=req.query.stringFolio != undefined ? req.query.stringFolio : "";
    let tipoUsuario = req.query.tipoUsuario != undefined ? req.query.tipoUsuario : "";
    //console.log(tipoUsuario);


    //EXCELL HEADERS-----
    var excel = require('excel4node');
    var dateFormat = require('dateformat');
    var workbook = new excel.Workbook();
    var tituloStyle = workbook.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: 'center',
      },
    });
    var headersStyle = workbook.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: 'left',
      },
    });
    var porcentajeStyle = workbook.createStyle({
        numberFormat: '#.0%; -#.0%; -'
    });
    var fitcellStyle = workbook.createStyle({
        alignment: {
            wrapText: true,
        },
    });
    let clientefiscal = await ClienteFiscal.findOne({ _id: req.query.clienteFiscal_id })
    let formatofecha=(clientefiscal._id == "5e33420d22b5651aecafe934" && tipoUsuario == "CLIENTE ADMINISTRADOR USA") ? "mm/dd/yyyy" : "dd/mm/yyyy";
    //console.log(tipoUsuario);
    let clienteEmbalaje = clientefiscal.arrEmbalajes ? clientefiscal.arrEmbalajes.split(',') :[""];
    let ArrayEmbalaje = await EmbalajesController.getArrayEmbalajes();
    var worksheet = workbook.addWorksheet('Partidas');
    worksheet.column(4).setWidth(20);
    worksheet.column(11).setWidth(35);
    worksheet.column(5).setWidth(45);
    worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
    worksheet.cell(2, 1).string('FolioEntrada').style(headersStyle);
    worksheet.cell(2, 2).string('FolioSalida').style(headersStyle);
    worksheet.cell(2, 3).string('Tipo').style(headersStyle);
    worksheet.cell(2, 4).string('Item').style(headersStyle);

    worksheet.cell(2, 5).string('Referencia').style(headersStyle);
    worksheet.cell(2, 6).string('Clave').style(headersStyle);
    worksheet.cell(2, 7).string('Orden compra').style(headersStyle);
    worksheet.cell(2, 8).string('Lote').style(headersStyle);
    worksheet.cell(2, 9).string('Producto').style(headersStyle);
    worksheet.cell(2, 10).string('subclasificacion').style(headersStyle);
    /*worksheet.cell(2, 6).string('T.').style(headersStyle);
    worksheet.cell(2, 7).string('Sacos.').style(headersStyle);*/
    let indexheaders=11;
    clienteEmbalaje.forEach(Embalaje=>{ 
        let index=ArrayEmbalaje.findIndex(obj=> (obj.clave == Embalaje));
            if(ArrayEmbalaje[index].clave== "cajas" && clientefiscal._id == "5e33420d22b5651aecafe934")
                worksheet.cell(2, indexheaders).string("Corrugados").style(headersStyle);
            else
                worksheet.cell(2, indexheaders).string(ArrayEmbalaje[index].nombre).style(headersStyle);
            indexheaders++;
        
    });
    //console.log("1")
    worksheet.cell(2, indexheaders).string('Fecha Ingreso').style(headersStyle);
    worksheet.cell(2, indexheaders+1).string('Fecha Alta Ingreso').style(headersStyle);
    worksheet.cell(2, indexheaders+2).string('Fecha Despacho').style(headersStyle);
    worksheet.cell(2, indexheaders+3).string('Fecha Alta Despacho').style(headersStyle); 
    worksheet.cell(2, indexheaders+4).string('Fecha Caducidad').style(headersStyle);  
    worksheet.cell(2, indexheaders+5).string('Tracto').style(headersStyle);  
    worksheet.cell(2, indexheaders+6).string('Remolque').style(headersStyle);  
    worksheet.cell(2, indexheaders+7).string('% Salida').style(headersStyle);
    worksheet.cell(2, indexheaders+8).string('Lapso').style(headersStyle);
    //worksheet.cell(2, indexheaders+6).string('Recibio').style(headersStyle);
    let i=3;

    //ENDEXCELHEADERS---

    try {

        if (arrClientesFiscales_id == undefined ) throw NullParamsException;
        if (arrSucursales_id == undefined ) throw NullParamsException;
        if (arrAlmacenes_id == undefined ) throw NullParamsException;
        if (tipo == undefined || tipo == "") throw NullParamsException;

        let filter = {
            clienteFiscal_id: arrClientesFiscales_id ,
            sucursal_id:  arrSucursales_id ,
            almacen_id: arrAlmacenes_id
            
            
        };
        if(fechaInicio != "" &&  fechaFinal != ""){
            if(fecha == "fechaAltaEntrada")
            {
                filter.fechaAlta={
                    $gte:fechaInicio,
                    $lt: fechaFinal
                };
            }
            if(fecha == "fechaEntrada")
            {
                filter.fechaEntrada={
                    $gte:fechaInicio,
                    $lt: fechaFinal
                };
            }
        }
        if(folioEntrada != "")
        {
            filter.stringFolio=folioEntrada;
        }
        //let entradas = await Entrada.find(filter).exec();
        //console.log(filter);
        await Entrada.find(filter)
        .populate({
            path: 'partidas',
            model: 'Partida'
        })
        .populate({
            path: 'partidas',
            populate: {
                path: 'producto_id',
                model: 'Producto',
            }
        }).populate({
            path: 'partidas',
            populate:{
                path: 'salidas_id.salida_id',
                model: 'Salida',
                select: 'folio stringFolio fechaSalida item'
            }
        }).then(async (entradas) => {
            //await Helper.asyncForEach(arrPartidas, async function (partida) {
            entradas.forEach(entrada => {
                //console.log(entrada);
                let partidas = entrada.partidas;
               // part
               // await Helper.asyncForEach(arrPartidas, async function (partida) {
                partidas.forEach((partida) => { 
                    //console.log(partida);
                    let resFecha=true
                    let resClasificacion=true;
                    let resSubclasificacion=true;
                    let resClave=true;
                    if(fecha == "fechaSalida" && partida.salidas_id != undefined && partida.salidas_id[0] !=undefined)
                    {
                        resFecha = new Date(partida.salidas_id[0].salida_id.fechaSalida)>=new Date(fechaInicio) && new Date(partida.salidas_id[0].salida_id.fechaSalida)<=new Date(fechaFinal);
                    }
                    else
                        if(fecha == "fechaSalida")
                        resFecha = false;
                    if(fecha == "fechaAltaSalida" && partida.salidas_id != undefined && partida.salidas_id[0] !=undefined)
                    {
                        resFecha = new Date(partida.salidas_id[0].salida_id.fechaAlta)>=new Date(fechaInicio) && new Date(partida.salidas_id[0].salida_id.fechaAlta)<=new Date(fechaFinal);
                    }
                    else
                        if(fecha == "fechaAltaSalida")
                            resFecha = false;
                    if(clave != "" && partida.producto_id._id.toString() !== clave)
                    {
                        resClave=false;
                    }
                    if(clasificacion != "")
                    {
                        resClasificacion=partida.producto_id.clasificacion_id.toString() == clasificacion.toString() ;
                    }
                    if(subclasificacion != "")
                    {
                        resSubclasificacion=partida.producto_id.subclasificacion_id.toString() == subclasificacion.toString();
                    }
                    if(entrada != undefined && resFecha==true && resClasificacion==true && resSubclasificacion ==true && resClave==true && (entrada.status=="APLICADA"||entrada.status=="FINALIZADO") && partida.status=="ASIGNADA" && (partida.tipo=="NORMAL" || partida.tipo=="AGREGADA" || partida.tipo=="MODIFICADA" || partida.tipo=="OUTMODIFICADA")) 
                    {   
                        //console.log(entrada.tipo);
                        let porcentaje = 0;
                        let totalEntrada = 0;
                        let totalResto = 0;
                        let totalSalida = 0;
                        var max="";
                        var lapso="";
                        for (let x in partida.embalajesEntrada) {
                            totalEntrada += partida.embalajesEntrada[x];
                            totalResto += partida.embalajesxSalir[x];
                        }
                        totalSalida = totalEntrada - totalResto;
                        porcentaje = (totalSalida / totalEntrada);
                        if(partida.salidas_id != undefined)
                        if (partida.salidas_id.length > 0 || partida.isEmpty === true){
                            let salidas_idInstances = partida.salidas_id.map(x => x.salida_id);
                            if(salidas_idInstances){
                                let fechasSalida = salidas_idInstances.map(x => x.fechaSalida) ? salidas_idInstances.map(x => x.fechaSalida) : "";
                                if(fechasSalida !== "" &&fechasSalida.length > 0){
                                    max = fechasSalida.reduce(function (a, b) { return a > b ? a : b; });
                                    var diff = Math.abs(max.getTime() - entrada.fechaEntrada.getTime());
                                    let ms= Math.floor(diff % 1000);
                                    let s= Math.floor(diff / 1000 % 60);
                                    let m= Math.floor(diff / 60000 % 60);
                                    let h= Math.floor(diff / 3600000 % 24);
                                    let d= Math.floor(diff / 86400000);
                                    max =dateFormat(max, formatofecha)
                                    lapso= d.toString() + ' día(s), ' + h.toString() + ' hora(s), ' + m.toString() + ' minuto(s)';
                                }
                            }
                        }
                        worksheet.cell(i, 1).string(entrada.stringFolio ? entrada.stringFolio:"");
                        worksheet.cell(i, 2).string(partida.salidas_id.length > 0  ? partida.salidas_id[0].salida_id.stringFolio: "");
                        worksheet.cell(i, 3).string(entrada.tipo ? entrada.tipo:"");
                        //console.log(entrada.tipo);
                        worksheet.cell(i, 4).string(entrada.item ? entrada.item:"");
                        worksheet.cell(i, 5).string(entrada.referencia ? entrada.referencia :"");
                        worksheet.cell(i, 6).string(partida.clave ? partida.clave:"");
                        worksheet.cell(i, 7).string(entrada.ordenCompra ? entrada.ordenCompra:"");
                        worksheet.cell(i, 8).string(partida.lote ? partida.lote:"");
                        worksheet.cell(i, 9).string(partida.descripcion ? partida.descripcion:""); 
                        worksheet.cell(i, 10).string(partida.producto_id.subclasificacion ? partida.producto_id.subclasificacion:"");

                        let indexbody=11;
                        clienteEmbalaje.forEach(emb=>
                        {   
                            let tarimas =0
                            if (emb == 'tarimas' && partida.producto_id.arrEquivalencias.length > 0) {
                                let band = false;
                                partida.producto_id.arrEquivalencias.forEach(function (equivalencia) {
                                   
                                    if (equivalencia.embalaje === "Tarima" && equivalencia.embalajeEquivalencia === "Caja" && partida.embalajesEntrada.cajas) {

                                        tarimas = partida.embalajesEntrada.cajas / equivalencia.cantidadEquivalencia ? (partida.embalajesEntrada.cajas / equivalencia.cantidadEquivalencia).toFixed(1) : 0;
                                        band = true;
                                    }
                                });
                                if (band !== true){
                                    tarimas = partida.embalajesEntrada.tarimas ? partida.embalajesEntrada.tarimas : 0;
                                }
                                worksheet.cell(i, indexbody).number(parseInt(tarimas));
                            }
                            else {
                                worksheet.cell(i, indexbody).number(partida.embalajesEntrada[emb] ? parseInt(partida.embalajesEntrada[emb]):0);
                            }
                            indexbody++;
                        });
                        worksheet.cell(i, indexbody).string(entrada.fechaEntrada ? dateFormat(entrada.fechaEntrada, formatofecha) : "");
                        worksheet.cell(i, indexbody+1).string(entrada.fechaAlta ? dateFormat(entrada.fechaAlta, formatofecha) : "");
                        worksheet.cell(i, indexbody+2).string(partida.salidas_id != undefined ? partida.salidas_id[0]!=undefined ? dateFormat(partida.salidas_id[0].salida_id.fechaSalida, formatofecha) : "":"");
                        worksheet.cell(i, indexbody+3).string(partida.salidas_id != undefined ? partida.salidas_id[0]!=undefined ? dateFormat(partida.salidas_id[0].salida_id.fechaAlta, formatofecha) : "":"");
                        worksheet.cell(i, indexbody+4).string(partida != undefined ? dateFormat(partida.fechaCaducidad, formatofecha) : "");
                        worksheet.cell(i, indexbody+5).string(entrada.tracto ? entrada.tracto :"SIN_ASIGNAR");
                        worksheet.cell(i, indexbody+6).string(entrada.remolque ? entrada.remolque :"SIN_ASIGNAR");
                        worksheet.cell(i, indexbody+7).number(isNaN(porcentaje)? 0 :porcentaje).style(porcentajeStyle);
                        worksheet.cell(i, indexbody+8).string(lapso).style(fitcellStyle);
                        //worksheet.cell(i, indexbody+6).string(partida.entrada_id.recibio ? partida.entrada_id.recibio:"");
                        i++;
                    }
                });
            });
        })

       // console.log("end");
        workbook.write('ReportePartidas'+dateFormat(Date.now(), formatofecha)+'.xlsx',res);
        //console.log("end");
    }
    catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

function sortByfechaEntadaAsc(a, b) {
    if (a.fechaEntrada == undefined || a.fechaEntrada == null || b.fechaEntrada == undefined || b.fechaEntrada == null) {
        return -1;
    }
    if (a.entrada_id.fechaEntrada < b.entrada_id.fechaEntrada) {
        return -1;
    }
    if (a.entrada_id.fechaEntrada > b.entrada_id.fechaEntrada) {
        return 1;
    }

    return 0;
}

/* Esta funcion es utilizada para guardar las partidas generadas desde un pedido
en la plataforma de Crossdock (XD). */
async function save(req, res) {
    let DuplicatedException = {
        name: "Server Error",
        level: "Show Stopper",
        message: "There are objects with the same attribute IDPedido, thus they cannot be created.",
        htmlMessage: "Error detected. There are objects with the same attribute IDPedido.",
        toString: function () { return this.name + ": " + this.message; }
    };

    try {
        let partidasCheck = await Partida.find({ 'InfoPedidos.IDPedido': { $in: req.body.IDPedido } }).exec();
        if (partidasCheck.length > 0) throw DuplicatedException;

        var arrPartidas_id = [];
        let arrPartidas = req.body.partidas;
        await Helper.asyncForEach(arrPartidas, async function (partida) {
            partida.InfoPedidos[0].IDAlmacen=req.body.IDAlmacen;
            let nPartida = new Partida(partida);
           // console.log(nPartida.InfoPedidos[0].IDAlmacen);
            //console.log(nPartida);
            await nPartida.save().then((partida) => {
                arrPartidas_id.push(partida._id);
            });
        });
        res.status(200).send(arrPartidas_id);
    }
    catch (e) {
        res.status(500).send(e);
    }
}

/* Esta funcion obtiene las partidas que estan asignadas
con uno o varios pedidos */
async function getByPedido(req, res) {
    try {
        Partida.find({ 'InfoPedidos.IDPedido': { $in: req.query.arrIDPedidos } }).then(function (partidas) {
            let NPartidas = [];
            partidas.forEach(partida => {
                let NPartida = JSON.parse(JSON.stringify(partida));
                if (req.query.arrIDPedidos.length == 1) NPartida.embalajesxPedido = NPartida.InfoPedidos.find(x => x.IDPedido == req.query.arrIDPedidos[0]).embalajes;
                NPartidas.push(NPartida);
            });
            res.status(200).send(NPartidas);
        });
    }
    catch (e) {
        res.status(500).send(e);
    }
}

/* Esta funcion actualiza las existencias de la partida
por un monto menor en cantidad de los embalajes
Se utiliza al hacer un pedido con partidas ya existentes.
Indicando que ese pedido es para una salida en ALM */
async function _update(req, res) {
    try {
        let arrPartidas = req.body.partidas;
        let arrPartidasUpdated = [];

        await Helper.asyncForEach(arrPartidas, async function (partida) {

            let changes = {
                embalajesAlmacen: partida.embalajesAlmacen,
                embalajesxSalir: partida.embalajesxSalir,
                InfoPedidos: partida.InfoPedidos,
                isEmpty: partida.isEmpty,
                posiciones: partida.posiciones,
                status: "SELECCIONADA"
            };

            let partidaUpdated = await Partida.findOneAndUpdate({ _id: partida._id.toString() }, { $set: changes }, { new: true });
            arrPartidasUpdated.push(partidaUpdated);

        });

        if (arrPartidas.length == arrPartidasUpdated.length) {
            res.status(200).send(arrPartidasUpdated);
        } else {
            res.status(304).send({ message: "Not all data was succesfully updated" });
        }
    }
    catch (e) {
        res.status(500).send(e);
    }
}

async function posicionar(partidas, almacen_id) {
    let pasilloBahia = await Pasillo.findOne({
        almacen_id: almacen_id,
        isBahia: true,
        statusReg: "ACTIVO"
    }).populate({
        path: 'posiciones.posicion_id'
    }).exec();

    let posicionBahia = pasilloBahia.posiciones[0].posicion_id;

    for (let partida of partidas) {
        if (partida.posiciones.length == 0) {
            let jPosicionBahia = {
                embalajesEntrada: partida.embalajesEntrada,
                embalajesxSalir: partida.embalajesxSalir,
                pasillo: pasilloBahia.nombre,
                pasillo_id: pasilloBahia._id,
                posicion: posicionBahia.nombre,
                posicion_id: posicionBahia._id,
                nivel_id: posicionBahia.niveles[0]._id,
                nivel: posicionBahia.niveles[0].nombre,
                ubicacion: pasilloBahia.nombre + posicionBahia.niveles[0].nombre + posicionBahia.nombre
            };
            partida.posiciones.push(jPosicionBahia);

            for (let posicion of partida.posiciones) {
                await Posicion.updateExistencia(1, posicion, partida.producto_id);
            }
        }
        else {
            let antiguaPartida = await Partida.findOne({ _id: partida._id });
            //console.log(antiguaPartida);
            if (partida.posiciones.length > 0)
                for (let posicion of antiguaPartida.posiciones) {
                    await Posicion.updateExistencia(-1, posicion, partida.producto_id);
                }

            for (let posicion of partida.posiciones) {
                await Posicion.updateExistencia(1, posicion, partida.producto_id);
            }
        }

        await Partida.updateOne({ _id: partida._id }, { $set: { posiciones: partida.posiciones } });
    }
}

function _put(jNewPartida) {
    Partida.findOne({ _id: jNewPartida._id })
        .then(async (partida) => {
            try {
                //console.log(partida);
                //console.log(jNewPartida);

                await Partida.updateOne({ _id: partida._id }, { $set: jNewPartida }).exec();
            }
            catch (e) {

            }
        });
}

async function updatePosicionPartida(req, res) {
    let bodyParams = req.body;
    let partida_id = bodyParams.partida_id;

    //console.log(partida_id);

    let partida = await Partida.findOne({ _id: partida_id }).exec();

    let currentPosicion = {
        posicion_id: partida.posiciones[0].posicion_id,
        nivel: partida.posiciones[0].nivel,
        embalajes: partida.posiciones[0].embalajesxSalir
    }

    await MovimientoInventarioController.updateExistenciaPosicion(-1, currentPosicion, partida.producto_id);

    let newPosicion = {
        posicion_id: bodyParams.posicion_id,
        nivel: bodyParams.nivel,
        embalajes: partida.posiciones[0].embalajesxSalir
    }
    await MovimientoInventarioController.updateExistenciaPosicion(1, newPosicion, partida.producto_id);

    Partida.updateOne(
        {
            _id: partida_id
        },
        {
            $set: {
                "posiciones.0.pasillo": bodyParams.pasillo,
                "posiciones.0.pasillo_id": bodyParams.pasillo_id,
                "posiciones.0.posicion": bodyParams.posicion,
                "posiciones.0.posicion_id": bodyParams.posicion_id,
                "posiciones.0.nivel": bodyParams.nivel,
                "posiciones.0.nivel_id": bodyParams.nivel_id
            }
        }
    )
        .then((partida) => {
            res.status(200).send(partida);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

async function updateCajasPedidas(req, res) {
    let id = req.body.id;
   // console.log(id);
    await Partida.updateOne({_id: id }, { $set: {"CajasPedidas": { "cajas" : req.body. pedidos} } })
        .then((partida) => {
            res.status(200).send(partida);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}
/////////////// D E P U R A C I O N   D E   C O D I G O ///////////////

// function sortByfechaEntadaDesc(a, b) {
//     if (a.entrada_id.fechaEntrada < b.entrada_id.fechaEntrada) {
//         return 1;
//     }
//     if (a.entrada_id.fechaEntrada > b.entrada_id.fechaEntrada) {
//         return -1;
//     }

//     return 0;
// }
async function posicionarAuto(id_pocision,id_partidas,nivelIndex)
{
    let partida = await Partida.findOne({ _id: id_partidas });
    let posicion = await PosicionModelo.findOne({ _id: id_pocision});
    let pasillo = await Pasillo.findOne({ _id: posicion.pasillo_id});
    partida.posiciones=[];
        let jPosicionBahia = {
            embalajesEntrada: partida.embalajesEntrada,
            embalajesxSalir: partida.embalajesxSalir,
            pasillo: pasillo.nombre,
            pasillo_id: pasillo._id,
            posicion: posicion.nombre,
            posicion_id: posicion._id,
            nivel_id: posicion.niveles[nivelIndex]._id,
            nivel: posicion.niveles[nivelIndex].nombre,
            ubicacion: pasillo.nombre + posicion.niveles[nivelIndex].nombre + posicion.nombre
        };
        partida.posiciones.push(jPosicionBahia);
        await partida.save();
        //console.log(partida);
    
}

async function posicionarPartidas(req, res)
{
    try {
        console.log(req.body);
        let id_partidas=req.body.partida_id;
        let id_pasillo=req.body.ubicacion.pasillo_id;
        let id_pocision=req.body.ubicacion.posicion_id;
        let nivel=req.body.ubicacion.nivel;
        let nivelIndex=parseInt(nivel)-1;
        let partida = await Partida.findOne({ _id: id_partidas });
        console.log(partida)
        let posicion = await PosicionModelo.findOne({ _id: id_pocision});
        let pasillo = await Pasillo.findOne({ _id: new ObjectId(id_pasillo)});
        let productos= await Producto.findOne({_id: new ObjectId(partida.producto_id)});
        /*console.log("Posicion---------------");
        console.log(posicion);
        console.log("Pasillo---------------");
        console.log(pasillo);
        console.log("---------------");
        console.log("nivel"+nivelIndex);*/
        if(partida.posiciones.length>0)
        {
            let posOld = await PosicionModelo.findOne({ _id: partida.posiciones[0].posicion});
            let indexniveles=posOld.niveles.findIndex(obj=> (obj._id.toString() == partida.posiciones[0].nivel_id.toString()));
            if(indexniveles>=0)
            {
                 if(posOld.niveles[indexniveles].productos.length<1)
                {
                    posOld.niveles[indexniveles].productos=[]
                    posOld.niveles[indexniveles].isCandadoDisponibilidad= false;
                    posOld.niveles[indexniveles].apartado =false;
                }        
            }
        }
        if(productos.isEstiba!=undefined && productos.isEstiba == true && posicion.niveles[nivelIndex].length<=1){//productoes stiba
            posicion.niveles[nivelIndex].isCandadoDisponibilidad = false; 
            posicion.niveles[nivelIndex].apartado = false;
        }
        else{
            posicion.niveles[nivelIndex].isCandadoDisponibilidad = true; 
            posicion.niveles[nivelIndex].apartado = true;
        }
        //console.log(posicion);
        await posicion.save();
        partida.posiciones=[];
        let jPosicionBahia = {
            embalajesEntrada: partida.embalajesEntrada,
            embalajesxSalir: partida.embalajesxSalir,
            pasillo: pasillo.nombre,
            pasillo_id: pasillo._id,
            posicion: posicion.nombre,
            posicion_id: posicion._id,
            nivel_id: posicion.niveles[nivelIndex]._id,
            nivel: posicion.niveles[nivelIndex].nombre,
            ubicacion: pasillo.nombre + posicion.niveles[nivelIndex].nombre + posicion.nombre
        };
        partida.posiciones.push(jPosicionBahia);

        await Partida.updateOne({_id: id_partidas}, {$set: {posiciones: partida.posiciones}}).exec();
        
        console.log(partida);
        res.status(200).send("ok");
    }
    catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
    /*
    
    let posicion = await PosicionModelo.findOne({ _id: id_pocision});
    let pasillo = await Pasillo.findOne({ _id: posicion.pasillo_id});
    partida.posiciones=[];
        let jPosicionBahia = {
            embalajesEntrada: partida.embalajesEntrada,
            embalajesxSalir: partida.embalajesxSalir,
            pasillo: pasillo.nombre,
            pasillo_id: pasillo._id,
            posicion: posicion.nombre,
            posicion_id: posicion._id,
            nivel_id: posicion.niveles[nivelIndex]._id,
            nivel: posicion.niveles[nivelIndex].nombre,
            ubicacion: pasillo.nombre + posicion.niveles[nivelIndex].nombre + posicion.nombre
        };
        partida.posiciones.push(jPosicionBahia);
        await partida.save();
        //console.log(partida);*/
    
}
//Reporte en base a items para la conciliacion diaria
async function reporteDia(req, res)
{   
    let respuesta=[];
    //console.log(req.query.fechaInicio);
    let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
    let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
   //console.log(fechaInicio);
   //console.log(fechaFinal);
    let filter = {
            clienteFiscal_id: req.query.clienteFiscal_id ,
            sucursal_id:  req.query.sucursal_id ,
            almacen_id: req.query.almacen_id ,
            status:{$in:["APLICADA","FINALIZADO"]},
            fechaEntrada:{$gte:fechaInicio,$lt:fechaFinal}
        }
    let filter2 = {
            clienteFiscal_id: req.query.clienteFiscal_id ,
            sucursal_id:  req.query.sucursal_id ,
            almacen_id: req.query.almacen_id ,
            tipo:req.query.tipo,
            fechaSalida:{$gte:fechaInicio,$lt:fechaFinal}
        }

    var entradasDia=await Entrada.find(filter).sort({ fechaEntrada: 1 }).exec();
    let inbyProd=[];
    let outbyProd=[];
    var salidas_id=[];
    //console.log(entradasDia.length);
    let clientefiscal = await ClienteFiscal.findOne({ _id: req.query.clienteFiscal_id })
    //console.log(tipoUsuario);
    let clienteEmbalaje = clientefiscal.arrEmbalajes ? clientefiscal.arrEmbalajes.split(',') :[""];
    var embalajesjson={};
    await clienteEmbalaje.forEach(emb=>{
        embalajesjson[emb]=0;
    });
   // console.log(embalajesjson);
    if(entradasDia.length>0)
    {
        await Helper.asyncForEach(entradasDia,async function (ed){
            await Helper.asyncForEach(ed.partidas,async function (par){
                let partidaT=await Partida.findOne({_id:par});
                if(inbyProd.find(obj=> (obj.clave == partidaT.clave)))
                {
                    //console.log("yes");
                    let index=inbyProd.findIndex(obj=> (obj.clave == partidaT.clave));
                    clienteEmbalaje.forEach(em=>{
                        
                        if(inbyProd[index].embalajesEntrada[em]!=undefined && partidaT.embalajesEntrada[em]!=undefined)
                            inbyProd[index].embalajesEntrada[em]+=partidaT.embalajesEntrada[em];
                    })
                }
                else
                {
                    const data={
                        clave:partidaT.clave,
                        embalajesEntrada: partidaT.embalajesEntrada
                    };
                    inbyProd.push(data)
                }
            });
        });
    }
    var salidasDia=await Salida.find(filter2).sort({ fechaSalida: 1 }).exec();
    if(salidasDia.length>0){
        await Helper.asyncForEach(salidasDia,async function (sd){

            await Helper.asyncForEach(sd.partidas,async function (par){
                let partidaT=await Partida.findOne({_id:par});
                //console.log(partidaT)
                let embalajesSalida;
                    salidas_id = partidaT.salidas_id;

                    salidas_id.forEach(elem => {
                        let elemId = elem.salida_id;
                        let paramId = sd._id;
                        if(JSON.stringify(elemId) == JSON.stringify(paramId)) {
                            embalajesSalida = elem.embalajes;
                        }
                    })
                if(outbyProd.find(obj=> (obj.clave == partidaT.clave)))
                {
                    //console.log("yes");
                    let index=outbyProd.findIndex(obj=> (obj.clave == partidaT.clave));
                    clienteEmbalaje.forEach(em=>{
                        //console.log(partidaT.embalajesEntrada);
                        if(outbyProd[index].embalajesSalida[em]!=undefined && embalajesSalida[em]!=undefined)
                            outbyProd[index].embalajesSalida[em]+=embalajesSalida[em];
                    })
                }
                else
                {
                    const data={
                        clave:partidaT.clave,
                        embalajesSalida: embalajesSalida
                    };
                    //console.log(data);
                    outbyProd.push(data)
                }
            });
        });
    }
    var productosDia=await Producto.find({clienteFiscal_id: req.query.clienteFiscal_id, statusReg: "ACTIVO"}).exec();
    //console.log(outbyProd.length+"-"+inbyProd.length)
    
        await Helper.asyncForEach(productosDia,async function (pd){
            let band=false;
            //console.log(embalajes);
            let inIndex=inbyProd.findIndex(obj=> (obj.clave == pd.clave));
            let outIndex=outbyProd.findIndex(obj=> (obj.clave == pd.clave));
            var auxprod={
                    clave:pd.clave,
                    descripcion:pd.descripcion,
                    subclasificacion:pd.subclasificacion,
                    corrugados:Helper.Clone(pd.embalajes),
                    entradas:Helper.Clone(inbyProd[inIndex]? inbyProd[inIndex].embalajesEntrada : embalajesjson),
                    salidas:Helper.Clone(outbyProd[outIndex]? outbyProd[outIndex].embalajesSalida:embalajesjson),
                    StockFinal:Helper.Clone(pd.embalajes)
                };
            //console.log(auxprod)
            await Helper.asyncForEach(clienteEmbalaje,async function (em){
                if(auxprod.corrugados[em]!=undefined && auxprod.entradas[em]!=undefined && auxprod.salidas[em]!=undefined  && auxprod.StockFinal[em]!=undefined && auxprod.StockFinal[em]!=0 )
                {
                    band=true;
                    auxprod.corrugados[em]=pd.embalajes[em]-auxprod.entradas[em] + auxprod.salidas[em];
                }
                
            })
            if(band == true){
               // console.log(auxprod)
                respuesta.push(auxprod);
            }

        });
    
    if(respuesta.length>0)
    {
        res.status(200).send(respuesta);
    }
    else
        res.status(200).send("ERROR");
}

async function getExcelreporteDia(req, res)
{   
    let respuesta=[];
    //console.log(req.query);
    let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
    let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
   //console.log(fechaInicio);
   //console.log(fechaFinal);
    let filter = {
            clienteFiscal_id: req.query.clienteFiscal_id ,
            sucursal_id:  req.query.sucursal_id ,
            almacen_id: req.query.almacen_id ,
            status:{$in:["APLICADA","FINALIZADO"]},
            fechaEntrada:{$gte:fechaInicio,$lt:fechaFinal}
        }
    let filter2 = {
            clienteFiscal_id: req.query.clienteFiscal_id ,
            sucursal_id:  req.query.sucursal_id ,
            almacen_id: req.query.almacen_id ,
            tipo:req.query.tipo,
            fechaSalida:{$gte:fechaInicio,$lt:fechaFinal}
        }

    var excel = require('excel4node');
        
    var workbook = new excel.Workbook();
    var tituloStyle = workbook.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: 'center',
      },
    });
    var ResultStyle = workbook.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: 'center',
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        bgColor: '#FF0000',
        fgColor: '#FF0000',
      },
    });
    var headersStyle = workbook.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: 'left',
      },
    });
    var porcentajeStyle = workbook.createStyle({
        numberFormat: '#.0%; -#.0%; -'
    });
    var fitcellStyle = workbook.createStyle({
        alignment: {
            wrapText: true,
        },
    });
    
     
    var worksheet = workbook.addWorksheet('Partidas');
    worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
    worksheet.cell(2, 1).string('Clave').style(headersStyle);
    worksheet.cell(2, 2).string('Descripcion').style(headersStyle);
    worksheet.cell(2, 3).string('Subclasificacion').style(headersStyle);
    worksheet.cell(2, 4).string('Corrugados').style(headersStyle);
    worksheet.cell(2, 5).string('Entradas').style(headersStyle);
    worksheet.cell(2, 6).string('Salidas').style(headersStyle);
    worksheet.cell(2, 7).string('Stock final').style(headersStyle);
    worksheet.cell(2, 8).string('Match').style(headersStyle);
    worksheet.cell(2, 9).string('On Hand Logistikgo').style(headersStyle);

    var entradasDia=await Entrada.find(filter).sort({ fechaEntrada: 1 }).exec();
    let inbyProd=[];
    let outbyProd=[];
    var salidas_id=[];
    //console.log(entradasDia.length);
    let clientefiscal = await ClienteFiscal.findOne({ _id: req.query.clienteFiscal_id })
    //console.log(tipoUsuario);
    let clienteEmbalaje = clientefiscal.arrEmbalajes ? clientefiscal.arrEmbalajes.split(',') :[""];
    var embalajesjson={};
    await clienteEmbalaje.forEach(emb=>{
        embalajesjson[emb]=0;
    });
   // console.log(embalajesjson);
    if(entradasDia.length>0)
    {
        await Helper.asyncForEach(entradasDia,async function (ed){
            await Helper.asyncForEach(ed.partidas,async function (par){
                let partidaT=await Partida.findOne({_id:par});
                if(inbyProd.find(obj=> (obj.clave == partidaT.clave)))
                {
                    //console.log("yes");
                    let index=inbyProd.findIndex(obj=> (obj.clave == partidaT.clave));
                    clienteEmbalaje.forEach(em=>{
                        
                        if(inbyProd[index].embalajesEntrada[em]!=undefined && partidaT.embalajesEntrada[em]!=undefined)
                            inbyProd[index].embalajesEntrada[em]+=partidaT.embalajesEntrada[em];
                    })
                }
                else
                {
                    const data={
                        clave:partidaT.clave,
                        embalajesEntrada: partidaT.embalajesEntrada
                    };
                    inbyProd.push(data)
                }
            });
        });
    }
    var salidasDia=await Salida.find(filter2).sort({ fechaSalida: 1 }).exec();
    console.log(salidasDia.length);
    if(salidasDia.length>0){
        await Helper.asyncForEach(salidasDia,async function (sd){

            await Helper.asyncForEach(sd.partidas,async function (par){
                let partidaT=await Partida.findOne({_id:par});
                //console.log(partidaT)
                let embalajesSalida;
                    salidas_id = partidaT.salidas_id;

                    salidas_id.forEach(elem => {
                        let elemId = elem.salida_id;
                        let paramId = sd._id;
                        if(JSON.stringify(elemId) == JSON.stringify(paramId)) {
                            embalajesSalida = elem.embalajes;
                        }
                    })
                if(outbyProd.find(obj=> (obj.clave == partidaT.clave)))
                {
                    //console.log("yes");
                    let index=outbyProd.findIndex(obj=> (obj.clave == partidaT.clave));
                    clienteEmbalaje.forEach(em=>{
                        //console.log(partidaT.embalajesEntrada);
                        if(outbyProd[index].embalajesSalida[em]!=undefined && embalajesSalida[em]!=undefined)
                            outbyProd[index].embalajesSalida[em]+=embalajesSalida[em];
                    })
                }
                else
                {
                    const data={
                        clave:partidaT.clave,
                        embalajesSalida: embalajesSalida
                    };
                    //console.log(data);
                    outbyProd.push(data)
                }
            });
        });
    }
    var productosDia=await Producto.find({clienteFiscal_id: req.query.clienteFiscal_id, statusReg: "ACTIVO"}).exec();
    //console.log(outbyProd.length+"-"+inbyProd.length)
        let i=2
        await Helper.asyncForEach(productosDia,async function (pd){
            let band=false;
            //console.log(embalajes);
            let inIndex=inbyProd.findIndex(obj=> (obj.clave == pd.clave));
            let outIndex=outbyProd.findIndex(obj=> (obj.clave == pd.clave));
            var auxprod={
                    clave:pd.clave,
                    descripcion:pd.descripcion,
                    subclasificacion:pd.subclasificacion,
                    corrugados:Helper.Clone(pd.embalajes),
                    entradas:Helper.Clone(inbyProd[inIndex]? inbyProd[inIndex].embalajesEntrada : embalajesjson),
                    salidas:Helper.Clone(outbyProd[outIndex]? outbyProd[outIndex].embalajesSalida:embalajesjson),
                    StockFinal:Helper.Clone(pd.embalajes)
                };
            //console.log(auxprod)
            await Helper.asyncForEach(clienteEmbalaje,async function (em){
                if(auxprod.corrugados[em]!=undefined && auxprod.entradas[em]!=undefined && auxprod.salidas[em]!=undefined  && auxprod.StockFinal[em]!=undefined && auxprod.StockFinal[em]!=0 )
                {
                    band=true;
                    auxprod.corrugados[em]=pd.embalajes[em]-auxprod.entradas[em] + auxprod.salidas[em];
                }
                
            })
            if(band == true){
               // console.log(auxprod)
               i=i+1;
               worksheet.cell(i, 1).string(auxprod.clave ? auxprod.clave:"");
               worksheet.cell(i, 2).string(auxprod.descripcion ? auxprod.descripcion:"");
               worksheet.cell(i, 3).string(auxprod.subclasificacion ? auxprod.subclasificacion:"");
               worksheet.cell(i, 4).number(auxprod.corrugados.cajas ? auxprod.corrugados.cajas:0);
               worksheet.cell(i, 5).number(auxprod.entradas.cajas ? auxprod.entradas.cajas:0);
               worksheet.cell(i, 6).number(auxprod.salidas.cajas ? auxprod.salidas.cajas:0);
               worksheet.cell(i, 7).number(auxprod.StockFinal.cajas ? auxprod.StockFinal.cajas:0);
               worksheet.cell(i, 8).formula('G'+i+'-'+'I'+i);
               worksheet.cell(i, 9).number(auxprod.StockFinal.cajas ? auxprod.StockFinal.cajas:0);

                respuesta.push(auxprod);
            }

        });
    
    if(respuesta.length>0)
    {
        workbook.write('ReporteConciliacion'+dateFormat(new Date(Date.now()-(5*3600000)), "dd/mm/yyyy")+'.xlsx',res);
    }
    else
        res.status(200).send("ERROR");
}


async function reporteFEFOS(req, res)
{   

    let respuesta=[];
    //console.log(req.query.fechaInicio);
    let fechaInicio= req.query.fechaInicio != undefined ? req.query.fechaInicio !="" ? new Date(req.query.fechaInicio).toISOString() :"" :"";
    let fechaFinal= req.query.fechaFinal != undefined ? req.query.fechaFinal !="" ? new Date(req.query.fechaFinal).toISOString() :"" :"";
   //console.log(fechaInicio);
   //console.log(fechaFinal);
    try {
        let filter = {
                clienteFiscal_id: req.query.clienteFiscal_id ,
                sucursal_id:  req.query.sucursal_id ,
                almacen_id: req.query.almacen_id ,
                status:{$in:["APLICADA","FINALIZADO"]}
            }
        let filter2 = {
                clienteFiscal_id: req.query.clienteFiscal_id ,
                sucursal_id:  req.query.sucursal_id ,
                almacen_id: req.query.almacen_id ,
                tipo:req.query.tipo,
                fechaSalida:{$gte:fechaInicio,$lt:fechaFinal}
            }

       
        let inbyProd=[];
        let outbyProd=[];
        var salidas_id=[];
        //console.log(entradasDia.length);
        let clientefiscal = await ClienteFiscal.findOne({ _id: req.query.clienteFiscal_id })
        //console.log(req.query.clienteFiscal_id);
        let clienteEmbalaje = clientefiscal.arrEmbalajes ? clientefiscal.arrEmbalajes.split(',') :[""];
        var embalajesjson={};
        await clienteEmbalaje.forEach(emb=>{
            embalajesjson[emb]=0;
        });
        console.log("entradas")
        await Entrada.find(filter).sort({ fechaEntrada: 1 })
        .populate({
            path: 'partidas',
            populate: {
                path: 'entrada_id',
                model: 'Entrada',
                select: 'stringFolio isEmpty clave embalajesEntrada embalajesxSalir fechaCaducidad tipo status'
            },
            select: 'stringFolio isEmpty clave embalajesEntrada embalajesxSalir fechaCaducidad tipo status'
        })
        .then(async(entradas) => {
            await entradas.forEach (async entrada => {
                var partida = entrada.partidas;
                await partida.forEach(async partidaT => {
                        //console.log(partidaT);
                        if(partidaT!= null){
                            const data={
                                clave:partidaT.clave,
                                embalajesEntrada: partidaT.embalajesEntrada,
                                embalajesxSalir: partidaT.embalajesxSalir,
                                fechaCaducidad: partidaT.fechaCaducidad
                            };
                            //console.log(partidaT)
                            let elem=await Producto.findOne({ _id: partidaT.producto_id });
                            let fechaFrescura = new Date(partidaT.fechaCaducidad.getTime()- (elem.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000)); 
                            
                            if(fechaFrescura > fechaInicio && partidaT.isEmpty == false && (partidaT.tipo=="NORMAL" || partidaT.tipo=="AGREGADA" || partidaT.tipo=="MODIFICADA" || partidaT.tipo=="OUTMODIFICADA") && partidaT.status=="ASIGNADA")
                                inbyProd.push(data)
                        }
                });
            });
        });
        console.log(inbyProd.length);
        console.log("salidas");
        var salidasDia=await Salida.find(filter2).sort({ fechaSalida: 1 }).exec();
        console.log(salidasDia.length);
        
        if(salidasDia.length>0){
            await Helper.asyncForEach(salidasDia,async function (sd){
                console.log(inbyProd.length);
                await Helper.asyncForEach(sd.partidas,async function (par){
                    let partidaT=await Partida.findOne({_id:par});
                    //console.log(partidaT)
                    let embalajesSalida;
                        salidas_id = partidaT.salidas_id;

                        salidas_id.forEach(elem => {
                            let elemId = elem.salida_id;
                            let paramId = sd._id;
                            if(JSON.stringify(elemId) == JSON.stringify(paramId)) {
                                embalajesSalida = elem.embalajes;
                            }
                        })
                    if(outbyProd.find(obj=> (obj.clave == partidaT.clave)))
                    {
                        let correct=0;
                        let wrong=0;
                        let total=0;
                        let fecha=0;
                        await Helper.asyncForEach(inbyProd,async function (p){
                            if (p.clave == partidaT.clave)
                            total++;
                            if(partidaT.fechaCaducidad < p.fechaCaducidad && p.clave == partidaT.clave)
                                correct++;
                            else
                                if(p.clave == partidaT.clave)
                                    wrong++;
                        });
                        let index=outbyProd.findIndex(obj=> (obj.clave == partidaT.clave));
                        clienteEmbalaje.forEach(em=>{
                            //console.log(partidaT.embalajesEntrada);
                            if(outbyProd[index].embalajesSalida[em]!=undefined && embalajesSalida[em]!=undefined){
                                outbyProd[index].embalajesSalida[em]+=embalajesSalida[em];
                               
                            }
                        })
                        if(partidaT.fechaCaducidad>sd.fechaSalida)       
                            fecha++;
                        outbyProd[index].correct=outbyProd[index].correct+correct;
                        outbyProd[index].wrong=outbyProd[index].wrong+wrong;
                        outbyProd[index].total=outbyProd[index].total+total;
                        outbyProd[index].totalT=outbyProd[index].totalT+1;
                        outbyProd[index].correctFecha=outbyProd[index].correctFecha+fecha;
                    }
                    else
                    {
                        let correct=0;
                        let wrong=0;
                        let total=0;
                        let fecha=0;
                        await Helper.asyncForEach(inbyProd,async function (p){
                            if (p.clave == partidaT.clave)
                            total++;
                            if(partidaT.fechaCaducidad < p.fechaCaducidad && p.clave == partidaT.clave)
                                correct++;
                            else
                                if (p.clave == partidaT.clave)
                                    wrong++;
                        
                        });
                        if(partidaT.fechaCaducidad>sd.fechaSalida)       
                            fecha++;
                        const data={ 
                            clave:partidaT.clave,
                            embalajesSalida: embalajesSalida,
                            correct:correct,
                            wrong:wrong,
                            totalT:1,
                            total:total,
                            correctFecha:fecha
                        };
                        //console.log("/---------------------------/");
                        //console.log(data);
                        outbyProd.push(data);
                    }
                });
            });
        }
        var productosDia=await Producto.find({clienteFiscal_id: req.query.clienteFiscal_id, statusReg: "ACTIVO"}).exec();
        //console.log(outbyProd.length+"-"+inbyProd.length)
        
            await Helper.asyncForEach(productosDia,async function (pd){
                let band=false;
                //console.log(embalajes);
                let inIndex=inbyProd.findIndex(obj=> (obj.clave == pd.clave));
                let outIndex=outbyProd.findIndex(obj=> (obj.clave == pd.clave));
                var auxprod={
                    clave:pd.clave,
                    descripcion:pd.descripcion,
                    subclasificacion:pd.subclasificacion,
                    salidas:Helper.Clone(outbyProd[outIndex] ? outbyProd[outIndex].embalajesSalida:embalajesjson),
                    totalCorrectos:outbyProd[outIndex] ? outbyProd[outIndex].correct:0,
                    totalWrong:outbyProd[outIndex] ? outbyProd[outIndex].wrong:0,
                    CorFEFO:outbyProd[outIndex] ? Math.round((outbyProd[outIndex].correct/outbyProd[outIndex].total)*100):0,
                    WroFEFO:outbyProd[outIndex] ? Math.round((outbyProd[outIndex].wrong/outbyProd[outIndex].total)*100):0,
                    totalT:outbyProd[outIndex] ?outbyProd[outIndex].totalT:0,
                    total:outbyProd[outIndex] ?outbyProd[outIndex].total:0,
                    correctFecha: outbyProd[outIndex] ?outbyProd[outIndex].correctFecha:0,
                    wrongFecha: outbyProd[outIndex] ?(outbyProd[outIndex].totalT-outbyProd[outIndex].correctFecha):0,
                    correctFechaPor: outbyProd[outIndex] ?(outbyProd[outIndex].correctFecha/outbyProd[outIndex].totalT)*100:0,
                    wrongFechaPor: outbyProd[outIndex] ?((outbyProd[outIndex].totalT-outbyProd[outIndex].correctFecha)/outbyProd[outIndex].totalT)*100:0
                    
                };
                //console.log(auxprod)
                respuesta.push(auxprod);

            });
        
        if(respuesta.length>0)
        {
            return res.status(200).send(respuesta);
        }
        else
            return res.status(200).send("ERROR");
    }
    catch (error) {
        console.log(error)
        return res.status(500).send(error);
    }
}
async function ModificaPartidas(req, res)
{
    console.log(req.body);
    try{

    let embalajes = Object.keys(req.body.embalajesEntrada)[0];
    
    let partida = await Partida.findOne({ _id: req.body.partida_id });
    let partidaSinModificacion = JSON.parse(JSON.stringify(partida));
        if(req.body.tipo !== undefined && req.body.tipo === "MODIFICAR"){
            partida.lote = req.body.lote;
            partida.fechaCaducidad = new Date(req.body.fechaCaducidad);
        }
          
    if(req.body.ubicacion)
    {
        let posiciones = partida.posiciones;
        
        let nivelNumber = Helper.getLevelNumberFromName(posiciones[0].nivel)
        
        if (nivelNumber <= 9)
        nivelNumber = "0" + nivelNumber;

        let ubicacionAnterior = posiciones[0].pasillo + posiciones[0].posicion + nivelNumber;    

        let auxMod={
            partida_id: req.body.partida_id,
            producto_id: partidaSinModificacion.producto_id,
            sucursal_id: req.body.sucursal_id,
            almacen_id: req.body.almacen_id,
            clienteFiscal_id: req.body.idClienteFiscal,
            usuarioAlta_id:req.body.usuarioAlta_id,
            nombreUsuario:req.body.nombreUsuario,
            loteAnterior: partidaSinModificacion.lote,
            fechaCaducidadAnterior: new Date(partida.fechaCaducidad),
            fechaProduccionAnterior: new Date(partida.fechaProduccion),
            embalajesAnteriores: partidaSinModificacion.embalajesxSalir,
            ubicacionAnterior: ubicacionAnterior
        }
        
        if(partida.lote!=req.body.lote){
            partida.lote=req.body.lote;
            auxMod.loteModificado=req.body.lote;
        }
        if(partida.fechaProduccion!=req.body.fechaProduccion){
            partida.fechaProduccion=new Date(req.body.fechaProduccion);
            auxMod.fechaProduccionModificada=new Date(req.body.fechaProduccion);
        }
        if(partida.fechaCaducidad!=req.body.fechaCaducidad){
            partida.fechaCaducidad=new Date(req.body.fechaCaducidad);
            auxMod.fechaCaducidadModificada=new Date(req.body.fechaCaducidad);
        }

        let id_pasillo=req.body.ubicacion.pasillo_id;
        let id_pocision=req.body.ubicacion.posicion_id;
        let nivel_id=req.body.ubicacion.nivel_id;
        let nivel=req.body.ubicacion.nivel;
        let nivelIndex=parseInt(nivel)-1;
        let posIndex=req.body.posIndex;
        var posicion = await PosicionModelo.findOne({ _id: new ObjectId(id_pocision)}).exec();
        var pasillo = await Pasillo.findOne({ _id: new ObjectId(id_pasillo)}).exec();
        var oldpos = await PosicionModelo.findOne({ _id: partida.posiciones[posIndex].posicion_id}).exec();
        var productosDia=await Producto.findOne({_id:partida.producto_id}).exec();

        console.log(nivel_id+"!="+partida.posiciones[posIndex].nivel_id.toString())
        if(nivel_id!=partida.posiciones[posIndex].nivel_id.toString())
        {
            console.log("testmove")
            // console.log(partida.posiciones[posIndex].nivel_id);
            console.log("niv:"+oldpos.niveles);
            let indexniveles=oldpos.niveles.findIndex(obj=> (obj._id.toString() == partida.posiciones[posIndex].nivel_id.toString()));console.log(indexniveles);
            if(indexniveles>=0){
                console.log(partida.producto_id.toString());
                let indexprod=oldpos.niveles[indexniveles].productos.findIndex(obj=> (obj.producto_id.toString()  == partida.producto_id.toString()));console.log("prod:"+indexprod);
                if(indexprod>=0){
                    oldpos.niveles[indexniveles].productos[indexprod].embalajes[embalajes]=oldpos.niveles[indexniveles].productos[indexprod].embalajes[embalajes]-partida.posiciones[posIndex].embalajesxSalir[embalajes];
                    console.log(embalajes+oldpos.niveles[indexniveles].productos[indexprod].embalajes[embalajes]);
                    let item = {
                        niveles: oldpos.niveles
                    }
                    //await PosicionModelo.updateOne({ _id: oldpos._id }, { $set: item });
                    if(oldpos.niveles[indexniveles].productos[indexprod].embalajes[embalajes]<1)
                    {
                        console.log("bnivel:"+oldpos.niveles[indexniveles].productos[indexprod])
                        oldpos.niveles[indexniveles].productos.splice(indexprod, 1);
                        console.log("nivel:"+oldpos.niveles[indexniveles])
                    }
                    if(productosDia.isEstiba!=undefined && productosDia.isEstiba == true && oldpos.niveles[indexniveles].productos.length==1 ){//productoes stiba
                        oldpos.niveles[indexniveles].isCandadoDisponibilidad = false; 
                        oldpos.niveles[indexniveles].apartado = false;
                    }
                    console.log(oldpos.niveles[indexniveles].productos.length);
                    if(oldpos.niveles[indexniveles].productos.length<1)
                    {
                        oldpos.niveles[indexniveles].productos=[]
                        oldpos.niveles[indexniveles].isCandadoDisponibilidad= false;
                        oldpos.niveles[indexniveles].apartado =false;
                    }
                    //posicion.niveles[nivelIndex].productos.find(obj=> (obj.factura == req.body.Pedido[i].Factura))
                    //console.log(posicion);
                    let item3 = {
                        niveles: oldpos.niveles
                    }
                    console.log(await PosicionModelo.updateOne({ _id: oldpos._id }, { $set: item3 }));
                    await oldpos.save();
                }
            }
            posicion = await PosicionModelo.findOne({ _id: new ObjectId(id_pocision)}).exec();
           // partida.posiciones[]=[];
            let jPosicionBahia = {
                embalajesEntrada: partida.posiciones[posIndex].embalajesxSalir,
                embalajesxSalir: partida.posiciones[posIndex].embalajesxSalir,
                pasillo: pasillo.nombre,
                pasillo_id: pasillo._id,
                posicion: posicion.nombre,
                posicion_id: posicion._id,
                nivel_id: posicion.niveles[nivelIndex]._id,
                nivel: posicion.niveles[nivelIndex].nombre,
                ubicacionModificada: pasillo.nombre + posicion.niveles[nivelIndex].nombre + posicion.nombre
            };
            partida.posiciones[posIndex]=jPosicionBahia;
            //console.log("E"+nivel)
            let indexnivelesNew=posicion.niveles.findIndex(obj=> (obj._id.toString()  == nivel_id.toString()));
           // console.log(indexnivelesNew)
           if(posicion.niveles[indexnivelesNew].productos.findIndex(x => x.producto_id.toString() == productosDia._id.toString())<0){
                 
                if(productosDia.isEstiba!=undefined && productosDia.isEstiba == true && posicion.niveles[indexnivelesNew].productos.length<1 ){//productoes stiba
                    posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = false; 
                    posicion.niveles[indexnivelesNew].apartado = false;
                }
                else{
                    posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = true; 
                    posicion.niveles[indexnivelesNew].apartado = true;
                }
                posicion.niveles[indexnivelesNew].productos.push({
                    producto_id: productosDia._id,
                    "embalajes": partida.posiciones[posIndex].embalajesxSalir
                });
            }
            else
            {
                let productoindex = posicion.niveles[indexnivelesNew].productos.findIndex(x => x.producto_id.toString() == productosDia._id.toString());
                
                console.log(posicion.niveles[indexnivelesNew].productos[productoindex].embalajes[embalajes])
                if(productosDia.isEstiba!=undefined && productosDia.isEstiba == true && posicion.niveles[indexnivelesNew].productos.length<1 ){//productoes stiba
                    posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = false; 
                    posicion.niveles[indexnivelesNew].apartado = false;
                }
                else{
                    posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = true; 
                    posicion.niveles[indexnivelesNew].apartado = true;
                }
                posicion.niveles[indexnivelesNew].productos[productoindex].embalajes[embalajes]=(posicion.niveles[indexnivelesNew].productos[productoindex].embalajes[embalajes])+partida.posiciones[posIndex].embalajesxSalir[embalajes];
            }
            let item2 = {
                niveles: posicion.niveles
            }
            await PosicionModelo.updateOne({ _id: posicion._id }, { $set: item2 });
            //await posicion.save();
            let nivelname = posicion.niveles[indexnivelesNew].nombre.charCodeAt(0) - 64;
            if (nivelname.toString().length < 2)
                nivelname = "0" + nivelname.toString()
            auxMod.ubicacionModificada=pasillo.nombre  + posicion.nombre+ nivelname;
        }
        console.log("second");
        if(partida.posiciones[posIndex].embalajesxSalir[embalajes] != req.body.embalajesEntrada[embalajes]){
            posicion = await PosicionModelo.findOne({ _id: new ObjectId(id_pocision)}).exec();
            console.log("testCant");
           let tempembalajes=partida.posiciones[posIndex].embalajesxSalir[embalajes];
           
            partida.embalajesxSalir[embalajes] = (partida.embalajesxSalir[embalajes]-partida.posiciones[posIndex].embalajesxSalir[embalajes])+req.body.embalajesEntrada[embalajes]

            if(partida.posiciones.length>0){
               // partida.posiciones[posIndex].embalajesEntrada= req.body.embalajesEntrada;
              // console.log("test1");
                productosDia.embalajes[embalajes]=(productosDia.embalajes[embalajes]-partida.posiciones[posIndex].embalajesxSalir[embalajes])+req.body.embalajesEntrada[embalajes];
                let item = {
                   "embalajes": productosDia.embalajes
                }
              //  console.log("test2");
                await Producto.updateOne({ _id: productosDia._id }, { $set: item });
                //await productosDia.save();
              //  console.log("test3");
                partida.posiciones[posIndex].embalajesxSalir= req.body.embalajesEntrada;
                let indexnivelesNew=posicion.niveles.findIndex(obj=> (obj._id.toString()  == nivel_id.toString()));
                console.log(indexnivelesNew+nivel_id);
                console.log(posicion.niveles[indexnivelesNew].productos.findIndex(x => x.producto_id.toString() == productosDia._id.toString())+"<0")
                if(posicion.niveles[indexnivelesNew].productos.findIndex(x => x.producto_id.toString() == productosDia._id.toString())<0){
                    posicion.niveles[indexnivelesNew].productos=[];
                    if(productosDia.isEstiba!=undefined && productosDia.isEstiba == true && posicion.niveles[indexnivelesNew].productos.length<1){//productoes stiba
                        posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = false; 
                        posicion.niveles[indexnivelesNew].apartado = false;
                    }
                    else{
                        posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = true; 
                        posicion.niveles[indexnivelesNew].apartado = true;
                    }
                    posicion.niveles[indexnivelesNew].productos.push({
                        producto_id: productosDia._id,
                        embalajes: partida.posiciones[posIndex].embalajesxSalir
                    });
                }
                else
                {
                    let productoindex = posicion.niveles[indexnivelesNew].productos.findIndex(x => x.producto_id.toString() == productosDia._id.toString());
                    
                    console.log(posicion.niveles[indexnivelesNew].productos[productoindex].embalajes[embalajes])
                    if(productosDia.isEstiba!=undefined && productosDia.isEstiba == true && posicion.niveles[indexnivelesNew].productos.length<1){//productoes stiba
                        posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = false; 
                        posicion.niveles[indexnivelesNew].apartado = false;
                    }
                    else{
                        posicion.niveles[indexnivelesNew].isCandadoDisponibilidad = true; 
                        posicion.niveles[indexnivelesNew].apartado = true;
                    }
                    posicion.niveles[indexnivelesNew].productos[productoindex].embalajes[embalajes]=(posicion.niveles[indexnivelesNew].productos[productoindex].embalajes[embalajes]-tempembalajes)+partida.posiciones[posIndex].embalajesxSalir[embalajes];
                }
              //  console.log("test5")
                let item2 = {
                niveles: posicion.niveles
                }
                await PosicionModelo.updateOne({ _id: posicion._id }, { $set: item2 });
                //await posicion.save();//console.log("test6")

            }
            auxMod.embalajesModificados=req.body.embalajesEntrada;
        }
        let nModificaciones = new ModificacionesModel(auxMod);
        await nModificaciones.save();
    }
    else
    {
        console.log("**************************************************")
            console.log( partida.producto_id+"===="+req.body.producto_id);

            if(partida.producto_id != req.body.producto_id){
                 let productosDia=await Producto.findOne({_id:req.body.producto_id}).exec();
                 console.log(productosDia);
                 partida.producto_id=productosDia._id;
                 partida.descripcion=productosDia.descripcion;
                 partida.clave=productosDia.clave;
            }
            if(partida.embalajesEntrada != req.body.embalajesEntrada){
                partida.embalajesEntrada = req.body.embalajesEntrada;
                partida.embalajesxSalir = req.body.embalajesEntrada;
                if(partida.posiciones.length>0){
                    partida.posiciones[0].embalajesEntrada= req.body.embalajesEntrada;
                    partida.posiciones[0].embalajesxSalir= req.body.embalajesEntrada;
                }
            }

    }

    let embalajesUpdate = {}
     
    embalajesUpdate[`embalajesxSalir.${embalajes}`] =  req.body.embalajesEntrada[embalajes]
    

    await Partida.updateOne({_id: req.body.partida_id }, { $set: embalajesUpdate })
    await partida.save();
    res.status(200).send("ok");
    }
    catch (error) {
        console.log(error)
        return res.status(500).send(error);
    }
}

async function getPartidaMod(req, res)
{

    let mongoose = require("mongoose");

    try {

        let pagination = {
            page: parseInt(req.query.page) || 10,
            limit: parseInt(req.query.limit) || 1
        }
        let partidas = [];

        const idClienteFiscal = req.query.idClienteFiscal;
        
        const filtro = {
            "isEmpty": false,
            "tipo": {$in: ["NORMAL", "AGREGADA", "MODIFICADA"]},
            "status": "ASIGNADA",
            
        };

        const lote = req.query.lote !== undefined ? req.query.lote.toUpperCase() : "";
        let clave = req.query.clave !== undefined ? req.query.clave : "";
        let semana= req.query.semana != undefined ? req.query.semana : "";
        let pasillo = req.query.pasillo !== undefined ? req.query.pasillo : "";

        if(pasillo !== "Staging"){
            pasillo = pasillo.toUpperCase();
        }

        const posicion = req.query.posicion !== undefined ? req.query.posicion : "";
        const nivel = req.query.nivel !== undefined ?  req.query.nivel : "";
        

        //Creacion del filtro avanzado, dependiendo los parametros enviados en el Endpoint
        if(clave !== ""){
            let regexForClave = new RegExp(clave, 'g');
            filtro.clave = {$regex: regexForClave};
        }

        if(lote !== ""){
            let regexForLote = new RegExp(lote, 'g');
            filtro.lote = {$regex: regexForLote};
        }

        if(semana !== ""){
            let regexForSemana = new RegExp(semana, 'g');
            filtro.lote = {$regex: regexForSemana};
        }

        if(pasillo !== ""){
            //let regexForPasillo = new RegExp(pasillo, "i", "g");
           filtro["posiciones.pasillo"] = pasillo
        }

        if(posicion !== ""){
            filtro["posiciones.posicion"] = posicion;
        }

        if(nivel !== ""){
            filtro["posiciones.nivel"] = Helper.getLevelNameFromNumber(nivel)
        }


            filtro["fromEntradas.clienteFiscal_id"] = mongoose.Types.ObjectId(idClienteFiscal)

            let partidasAggregate = Partida.aggregate([

                {$lookup: {"from":"Entradas", "localField": "entrada_id", "foreignField": "_id", "as":"fromEntradas"}},
                {$lookup: {"from":"Productos", "localField": "producto_id", "foreignField": "_id", "as":"fromProductos"}},
        
                {$match: filtro},
        
                        {$project: {
                            _id: 1,
                            valor: 1,
                            isEmpty: 1,
                            origen: 1,
                            tipo: 1,
                            status: 1,
                            isExtraordinaria: 1,
                            clave: 1,
                            descripcion: 1,
                            embalajesEntrada: 1,
                            embalajesxSalir: 1,
                            fechaProduccion: 1,
                            fechaCaducidad: 1,
                            referenciaPedidos: 1,
                            refpedido: 1,
                            lote: 1,
                            InfoPedidos: 1,
                            posiciones: 1,
                            __v: 1,
                            "producto_id": "$fromProductos",
                            "fromEntradas.stringFolio": 1,
                            "fromEntradas.clienteFiscal_id": 1
                         }},
        
            ])
            
            partidas = await Partida.aggregatePaginate(partidasAggregate, pagination);
            //partidas = partidas.docs;    

        
        let partidasPorCliente = [];
        partidas.docs.forEach(partida =>{
            let posiciones = partida.posiciones;
            
            for(let i = 0; i < posiciones.length; i++){
                if(posiciones[i].isEmpty === false){
                let infoPartida = getInfoPartida(partida);
                    infoPartida["producto_id"] = partida.producto_id[0];
                    infoPartida["embalajesxSalir"] = posiciones[i].embalajesxSalir;
                    infoPartida["embalajesEntrada"] = posiciones[i].embalajesEntrada;
                    infoPartida["posiciones"] = [];
                    infoPartida["posiciones"].push(posiciones[i]);
                    infoPartida["posIndex"]=i;
                    //console.log( infoPartida["posiciones"]);
                    partidasPorCliente.push(infoPartida);
                }
            }
        })


            partidas.docs = partidasPorCliente;
            res.status(200).send(partidas);
        

    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }

    
}


async function getPartidaModExcel(req, res)
{

    let mongoose = require("mongoose");

    try {
        let partidas = [];

        //Obtener embalaje dependiendo el cliente
        const idClienteFiscal = req.query.idClienteFiscal;
        const clienteFiscal = await ClienteFiscal.findById(idClienteFiscal).exec();
        const arrEmbalajes = clienteFiscal.arrEmbalajes;
        const embalaje = arrEmbalajes.split(",")[1];


        const filtro = {
            "isEmpty": false,
            "tipo": {$in: ["NORMAL", "AGREGADA", "MODIFICADA"]},
            "status": "ASIGNADA",
            
        };

        const lote = req.query.lote !== undefined ? req.query.lote.toUpperCase() : "";
        let clave = req.query.clave !== undefined ? req.query.clave : "";
        let semana= req.query.semana != undefined ? req.query.semana : "";
        
        let pasillo = req.query.pasillo !== undefined ? req.query.pasillo : "";

        if(pasillo !== "Staging"){
            pasillo = pasillo.toUpperCase();
        }


        const posicion = req.query.posicion !== undefined ? req.query.posicion : "";
        const nivel = req.query.nivel !== undefined ?  req.query.nivel : "";
        

        //Creacion del filtro avanzado, dependiendo los parametros enviados en el Endpoint
        if(clave !== ""){
            let regexForClave = new RegExp(clave, 'g');
            filtro.clave = {$regex: regexForClave};
        }

        if(lote !== ""){
            let regexForLote = new RegExp(lote, 'g');
            filtro.lote = {$regex: regexForLote};
        }

        if(semana !== ""){
            let regexForSemana = new RegExp(semana, 'g');
            filtro.lote = {$regex: regexForSemana};
        }

        if(pasillo !== ""){
           filtro["posiciones.pasillo"] = pasillo;
        }

        if(posicion !== ""){
            filtro["posiciones.posicion"] = posicion;
        }

        if(nivel !== ""){
            filtro["posiciones.nivel"] = Helper.getLevelNameFromNumber(nivel)
        }


            filtro["fromEntradas.clienteFiscal_id"] = mongoose.Types.ObjectId(idClienteFiscal)

            partidas = await Partida.aggregate([

                {$lookup: {"from":"Entradas", "localField": "entrada_id", "foreignField": "_id", "as":"fromEntradas"}},
        
                {$match: filtro},
        
                        {$project: {
                            _id: 1,
                            valor: 1,
                            isEmpty: 1,
                            origen: 1,
                            tipo: 1,
                            status: 1,
                            isExtraordinaria: 1,
                            clave: 1,
                            descripcion: 1,
                            embalajesEntrada: 1,
                            embalajesxSalir: 1,
                            fechaProduccion: 1,
                            fechaCaducidad: 1,
                            lote: 1,
                            InfoPedidos: 1,
                            posiciones: 1,
                            __v: 1,
                            "fromEntradas.stringFolio": 1,
                            "fromEntradas.clienteFiscal_id": 1
                         }},
        
            ])
            
        let partidasPorCliente = [];
        partidas.forEach(partida =>{
            let posiciones = partida.posiciones;
            
            for(let i = 0; i < posiciones.length; i++){
                if(posiciones[i].isEmpty === false){
                let infoPartida = getInfoPartida(partida);
                
                    infoPartida["embalajesxSalir"] = posiciones[i].embalajesxSalir;
                    infoPartida["embalajesEntradas"] = posiciones[i].embalajesEntrada;
                    infoPartida["posiciones"] = [];
                    infoPartida["posiciones"].push(posiciones[i]);
                    infoPartida["posIndex"]=i;
                    //console.log( infoPartida["posiciones"]);
                    partidasPorCliente.push(infoPartida);
                }
            }
        })


            
    //EXCELL HEADERS-----
    var excel = require('excel4node');
    var dateFormat = require('dateformat');
    var workbook = new excel.Workbook();
    var worksheet = workbook.addWorksheet('Partidas');
    var tituloStyle = workbook.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: 'center',
      },
    });
    var headersStyle = workbook.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: 'left',
      },
    });
 
    worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
    worksheet.cell(2, 1).string('Lote').style(headersStyle);
    worksheet.cell(2, 2).string('Clave').style(headersStyle);
    worksheet.cell(2, 3).string('Descripcion').style(headersStyle);
    worksheet.cell(2, 4).string('Fecha Caducidad').style(headersStyle);
    worksheet.cell(2, 5).string('Tarimas').style(headersStyle);
    worksheet.cell(2, 6).string("Corrugados").style(headersStyle);
    worksheet.cell(2, 7).string("Pasillo").style(headersStyle);
    worksheet.cell(2, 8).string("Posición").style(headersStyle);
    worksheet.cell(2, 9).string("Nivel").style(headersStyle);
    worksheet.cell(2, 10).string("Ubicaciones").style(headersStyle);

    let row = 3;
    partidasPorCliente.forEach((partida, index) =>{

        const { lote, clave, descripcion, fechaCaducidad, embalajesxSalir, posiciones  } = partida;

        let nivel = Helper.getLevelNumberFromName(posiciones[0].nivel);
        
        if(nivel < 10){
            nivel = "0"+nivel;
        }

        let ubicacion = `${posiciones[0].pasillo}-${posiciones[0].posicion}-${nivel}`;

        try {
            
        worksheet.cell(row, 1).string(lote === undefined || null ? "" : lote);
        worksheet.cell(row, 2).string(clave === undefined || null ? "" : clave);
        worksheet.cell(row, 3).string(descripcion === undefined || null ? "" : descripcion);
        worksheet.cell(row, 4).string(fechaCaducidad === undefined || null ? "" : dateFormat(fechaCaducidad, "dd/mm/yyyy"));
        worksheet.cell(row, 5).number(1);
        worksheet.cell(row, 6).number(embalajesxSalir[embalaje] === undefined || null ? 0 : embalajesxSalir[embalaje]);
        worksheet.cell(row, 7).string(posiciones[0].pasillo === undefined || null ? "" : posiciones[0].pasillo);
        worksheet.cell(row, 8).string(posiciones[0].posicion === undefined || null ? "" : posiciones[0].posicion);
        worksheet.cell(row, 9).string(posiciones[0].nivel === undefined || null ?  "" : ""+nivel);
        worksheet.cell(row, 10).string(ubicacion);
        } catch (error) {

            console.log(error);
        }

        
        row++;

    });

    workbook.write('ReporteModificaciones'+dateFormat(Date.now(), "dd/mm/yyyy")+'.xlsx',res);

        

    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }

    
}

function getInfoPartida(partida){

    let infoPartida = { };

    infoPartida["valor"] = partida.valor;
    infoPartida["isEmpty"] = partida.isEmpty;
    infoPartida["origen"] = partida.origen;
    infoPartida["tipo"] = partida.tipo;
    infoPartida["isExtraordinaria"] = partida.isExtraordinaria;
    infoPartida["pedido"] = partida.pedido;
    infoPartida["refpedido"] = partida.refpedido;
    infoPartida["statusPedido"] = partida.statusPedido;
    infoPartida["CajasPedidas"]= partida.CajasPedidas
    infoPartida["saneado"] = partida.saneado;
    infoPartida["_id"] = partida._id;
    infoPartida["producto_id"] = partida.producto_id;
    infoPartida["clave"] = partida.clave;
    infoPartida["descripcion"] = partida.descripcion;
    infoPartida["lote"] = partida.lote;
    infoPartida["fechaProduccion"] = partida.fechaProduccion;
    infoPartida["fechaCaducidad"] = partida.fechaCaducidad;
    infoPartida["salidas_id"] = partida.salidas_id;
    infoPartida["InfoPedidos"] = partida.InfoPedidos;
    infoPartida["entrada_id"] = partida.entrada_id;
    infoPartida["referenciaPedidos"] = partida.referenciaPedidos;

    return infoPartida;


}

async function LimpiaPosicion(req, res)
{
    try {
        console.log(req.body);
        let id_partidas=req.body.partida_id;
        let partida = await Partida.findOne({ _id: id_partidas });
        let posicion = await PosicionModelo.findOne({ _id: partida.posiciones[0].posicion_id});
        /*console.log("Posicion---------------");
        console.log(posicion);
        console.log("Pasillo---------------");
        console.log(pasillo);
        console.log("---------------");
        console.log("nivel"+nivelIndex);*/
        let nivelIndex=partida.posiciones[0].nivel.charCodeAt(0) - 64;
        nivelIndex=nivelIndex-1;
        posicion.niveles[nivelIndex].isCandadoDisponibilidad = false; 
        posicion.niveles[nivelIndex].apartado = false;
        //console.log(posicion);
        await posicion.save();
        partida.posiciones=[];
        

        await partida.save();
        console.log(partida);
        res.status(200).send("ok");
    }
    catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
    /*
    
    let posicion = await PosicionModelo.findOne({ _id: id_pocision});
    let pasillo = await Pasillo.findOne({ _id: posicion.pasillo_id});
    partida.posiciones=[];
        let jPosicionBahia = {
            embalajesEntrada: partida.embalajesEntrada,
            embalajesxSalir: partida.embalajesxSalir,
            pasillo: pasillo.nombre,
            pasillo_id: pasillo._id,
            posicion: posicion.nombre,
            posicion_id: posicion._id,
            nivel_id: posicion.niveles[nivelIndex]._id,
            nivel: posicion.niveles[nivelIndex].nombre,
            ubicacion: pasillo.nombre + posicion.niveles[nivelIndex].nombre + posicion.nombre
        };
        partida.posiciones.push(jPosicionBahia);
        await partida.save();
        //console.log(partida);*/
    
}

async function getExcelInventory(req, res){

    let _idClienteFiscal = req.query.idClienteFiscal !== undefined ?  req.query.idClienteFiscal :"";
    let almacen_id =  req.query.almacen_id !== undefined ? req.query.almacen_id : "";

    //console.log(req.query.almacen_id);
    
    let arrProd=[];
    Producto.find({ arrClientesFiscales_id: { $in: [_idClienteFiscal] }, statusReg: "ACTIVO" })
        .populate({
            path: 'presentacion_id',
            model: 'Presentacion'
        })
        .populate({
            path: 'clasificacion_id',
            model: 'ClasificacionesProductos'
        }).populate({
            path: "clienteFiscal_id",
            model: "ClienteFiscal"
        })
        .sort({clave: 1}).collation({ locale: "af", numericOrdering: true})
        .then(async (productos) => {
            //console.log(productos);
           /*   if (almacen_id != undefined && almacen_id != "") {
                await Helpers.asyncForEach(productos, async function (producto) {
                    producto.embalajesAlmacen = await getExistenciasAlmacen(almacen_id, producto);
                });
            }  */
                await Helpers.asyncForEach(productos, async function (producto) {
                    
                    const { clave } = producto;
                    let clienteEmbalaje = producto.clienteFiscal_id.arrEmbalajes
                    let cantidadProductoPartidas = await getInventarioPorPartidas(clave, clienteEmbalaje);

                    if(cantidadProductoPartidas.length !== 0){
						clienteEmbalaje.split(",").forEach(clienteEmbalaje =>{
                            producto.embalajes[clienteEmbalaje] = cantidadProductoPartidas[clienteEmbalaje]
                        })
                    }

                    if(almacen_id !== "")
                    {
                        if(producto.almacen_id.find(element => element.toString() == almacen_id)){
                            //console.log(producto.almacen_id +"==="+almacen_id);
                            arrProd.push(producto);
                        }
                    }
                    else
                    {
                        arrProd.push(producto);
                    }
                });

                //EXCELL HEADERS-----
                var excel = require('excel4node');
                var dateFormat = require('dateformat');
                var workbook = new excel.Workbook();
                var worksheet = workbook.addWorksheet('Inventario');
                var tituloStyle = workbook.createStyle({
                font: {
                    bold: true,
                },
                alignment: {
                    wrapText: true,
                    horizontal: 'center',
                },
                });
                var headersStyle = workbook.createStyle({
                font: {
                    bold: true,
                },
                alignment: {
                    horizontal: 'center',
                },
    });

                let alertstyle = workbook.createStyle({
                    font: {
                    bold: true,
                    },
                    alignment: {
                    wrapText: true,
                    horizontal: 'center',
                    },
                    fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    bgColor: '#F01B2F',
                    fgColor: '#F01B2F',
                    },
                });
                let correctStyle = workbook.createStyle({
                    font: {
                    bold: true,
                    },
                    alignment: {
                    wrapText: true,
                    horizontal: 'center',
                    },
                    fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    bgColor: '#57D377',
                    fgColor: '#57D377',
                    },
                });
                worksheet.column(2).setWidth(50);
                worksheet.column(1).setWidth(15);
                worksheet.column(3).setWidth(15);
                worksheet.column(4).setWidth(15);
                worksheet.column(8).setWidth(15);
                worksheet.column(9).setWidth(15);
                worksheet.column(10).setWidth(15);
                

                worksheet.cell(1, 1, 1, 14, true).string('LogistikGO - Almacén').style(tituloStyle);
                worksheet.cell(2, 1).string('Clave').style(headersStyle);
                worksheet.cell(2, 2).string('Descripción').style(headersStyle);
                worksheet.cell(2, 3).string('Subclasificacion').style(headersStyle);
                worksheet.cell(2, 4).string('Presentacion').style(headersStyle);
                worksheet.cell(2, 5).string('Tarimas').style(headersStyle);
                worksheet.cell(2, 6).string("Corrugados").style(headersStyle);
                worksheet.cell(2, 7).string("Valor").style(headersStyle);
                worksheet.cell(2, 8).string("SafetyStock T.").style(headersStyle);
                worksheet.cell(2, 9).string("Safety Stock C.").style(headersStyle);
                worksheet.cell(2, 10).string("% SS").style(headersStyle);
                worksheet.cell(2, 11).string("Ultima Entrada").style(headersStyle);
                worksheet.cell(2, 12).string("Ultima Salida").style(headersStyle);
                

                let row = 3;
                arrProd.forEach((producto, index) =>{

                    try {
                      
                    let clave = producto.clave;
                    let descripcion = producto.descripcion;
                    let subclasificacion = producto.subclasificacion;
                    let presentacion = producto.presentacion;
                    let tarimas = parseInt(producto.embalajes.tarimas);
                    let corrugados = parseInt(producto.embalajes.cajas);
                    let valor = producto.valor;
                    
                    let safetyStock =  0;
                    let saftyStockEmbalajes = 0;
                        if(producto.safetystock !== null && producto.safetystock !== undefined){
                            safetyStock = parseInt(producto.safetystock);
                            saftyStockEmbalajes = Math.floor(safetyStock / producto.arrEquivalencias[0].cantidadEquivalencia);
                        } 
                    let safetyStockPorcentaje = "0.0%";

                    let ultimaEntrada = dateFormat(producto.fechaUltimaEntrada, "dd/mm/yyyy");
                    let ultimaSalida = dateFormat(producto.fechaUltimaSalida, "dd/mm/yyyy");

                    worksheet.cell(row, 1).string(clave === undefined || null ? "" : clave);
                    worksheet.cell(row, 2).string(descripcion === undefined || null ? "" : descripcion);
                    worksheet.cell(row, 3).string(subclasificacion === undefined || null ? "" : subclasificacion);
                    worksheet.cell(row, 4).string(presentacion === undefined || null ? "" : presentacion);
                    worksheet.cell(row, 5).number(tarimas === undefined || null ? 0 : tarimas);
                    worksheet.cell(row, 6).number(corrugados === undefined || null ? 0 : corrugados);
                    worksheet.cell(row, 7).number(valor === undefined || null ? 0 : valor);
                    worksheet.cell(row, 8).number(saftyStockEmbalajes);
                    worksheet.cell(row, 9).number(safetyStock);

                    if(safetyStock !== 0 && corrugados !== 0){
                        let porcentaje = (corrugados / safetyStock) * 100;
                        safetyStockPorcentaje = ((safetyStock || corrugados) === 0) ? `0.0%` : `${porcentaje.toFixed(1)}%`;

                        if(porcentaje >= 100){
                            worksheet.cell(row, 10).string(safetyStockPorcentaje === undefined || null ? "0.0%" : safetyStockPorcentaje).style(correctStyle);
                        }else{
                            worksheet.cell(row, 10).string(safetyStockPorcentaje === undefined || null ? "0.0%" : safetyStockPorcentaje).style(alertstyle);
                        }
                    }else{
                        worksheet.cell(row, 10).string(safetyStockPorcentaje === undefined || null ? "0.0%" : safetyStockPorcentaje).style(alertstyle);
                    } 
                    worksheet.cell(row, 11).string(ultimaEntrada === undefined || null ? 0 : ultimaEntrada);
                    worksheet.cell(row, 12).string(ultimaSalida === undefined || null ? 0 : ultimaSalida);
                    
                    row++;
                    } catch (error) {
                        res.status(500).send(error);
                    }

                })

                workbook.write('InventarioPorProducto'+dateFormat(Date.now(), "dd/mm/yyyy")+'.xlsx',res);
                //res.status(200).send(arrProd);

               
        })   
 }

 async function getInventarioPorPartidas(clave, clienteEmbalaje = "cajas"){

    //tarimas,tambos,cajas,cubetas,galones,botes,totes

    let embalajes = clienteEmbalaje.split(",");
    
    let cantidadPartidasEmbalajes = {};

     await Helpers.asyncForEach(embalajes, async function(embalaje){
        let matchProducto = {
            _id: "$clave", cantidadProducto: {$sum:`$embalajesxSalir.${embalaje}`}, cantidadTarimas: {$sum: 1} 
        }
    
        let cantidadPartidas = await Partida.aggregate([
        
            {$match:{"clave": clave, isEmpty: false, status : "ASIGNADA"}},
            {$group: matchProducto}
        ])

        if(cantidadPartidas.length !== 0){

            if(embalaje === "tarimas"){
                cantidadPartidasEmbalajes[embalaje] = cantidadPartidas[0].cantidadTarimas;
            }else{
                cantidadPartidasEmbalajes[embalaje] = cantidadPartidas[0].cantidadProducto;
            }

        }else{
            cantidadPartidasEmbalajes[embalaje] = 0;
        }

     });

    return cantidadPartidasEmbalajes;
 }


 async function removePartidasWithZeroQuantity(req, res){

    
    try {
        const clienteFiscal_id = req.query?.clienteFiscal_id;
        const almacen_id = req.query?.almacen_id;

        const Partidas = await Partida.aggregate([
        {$lookup: {"from": "Entradas", "localField": "entrada_id", "foreignField": "_id", "as": "fromEntradas"}}
        ,
        {$match: {"fromEntradas.clienteFiscal_id": ObjectId(clienteFiscal_id), 
                  "fromEntradas.almacen_id": ObjectId(almacen_id),
                  "isEmpty": false, 
                  "embalajesxSalir.cajas": 0}}
    ]).exec();

        if(Partidas.length > 0){
            await removePartidaPosicion(Partidas);
            return res.status(200).send({statusCode: 200, response: `Se han depurado ${Partidas.length} partidas en cero`});
        }else{
            return res.status(200).send({statusCode: 200, response: `No existen partidas en cero en este momento`});
        }

    } catch (error) {
        return res.status(500).send({statusCode: 500}, "error");
    }


    
 }


async function removePartidaPosicion(partidas){

    await Helpers.asyncForEach(partidas, async function(partida){
        
        try {
            let partidaaux = await Partida.findOne({_id:partida._id}).exec();
            partidaaux.isEmpty = true;
            partidaaux.origen = partida.origen+"-REMOVE";
            partidaaux.posiciones[0].isEmpty = true;
            let nivel_id = partidaaux.posiciones[0].nivel_id;
            let posicion_id = partidaaux.posiciones[0].posicion_id;
            let producto_id = partidaaux.producto_id;
    
            let PosicionActual = await PosicionModelo.find({"_id": mongoose.Types.ObjectId(posicion_id)}).exec();
    
            let niveles = PosicionActual[0].niveles;
    
            let nivelActual = niveles.find(nivel => nivel._id.toString() === nivel_id.toString());
            nivelActual.isCandadoDisponibilidad = false;
            nivelActual.apartado = false;
            nivelActual.productos = nivelActual.productos.filter(producto => producto.producto_id.toString() !== producto_id.toString());
            
            await partidaaux.save();
            await PosicionActual[0].save();
        } catch (error) {
            console.error(error)
                    
        }    

    });

}

module.exports = {
    get,
    post,
    addSalida,
    getbyid,
    getByEntrada,
    getByEntradaSalida,
    getBySalida,
    getBySalidaConIDCarga,
    saveIDCarga,
    put,
    getByProductoEmbalaje,
    getPartidasByIDs,
    save,
    getByPedido,
    _update,
    posicionar,
    _put,
    updateForSalidaAutomatica,
    asignarEntrada,
    updatePosicionPartida,
    updateCajasPedidas,
    posicionarAuto,
    getExcelByIDs,
    reporteDia,
    getExcelreporteDia,
    reporteFEFOS,
    posicionarPartidas,
    ModificaPartidas,
    getPartidaMod,
    LimpiaPosicion,
    getExcelInventory,
    getPartidaModExcel,
    getInventarioPorPartidas,
    verificarPartidasSalidas,
    removePartidasWithZeroQuantity
}