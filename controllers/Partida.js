'use strict'

const Partida = require('../models/Partida');
const Salida = require('../models/Salida');
const Entrada = require('../models/Entrada');
const Pasillo = require('../models/Pasillo');
const Producto = require('../models/Producto');
const Posicion = require('./Posicion');
const PosicionModelo = require('../models/Posicion');
const MovimientoInventarioController = require('./MovimientoInventario');
const Helper = require('../helpers');
const NullParamsException = { error: "NullParamsException" };
const BreakException = { info: "Break" };
const dateFormat = require('dateformat');
const EmbalajesController = require('../controllers/Embalaje');
const ClienteFiscal = require('../models/ClienteFiscal');

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

async function getByEntrada(req, res) {
    let entrada_id = req.params.entrada_id;

    Partida.find({ entrada_id: entrada_id })
        .then(async (partidas) => {
            console.log(partidas.length);
            let arrpartida=[];
            await Helper.asyncForEach(partidas, async function (partida) 
            {
                if((partida.tipo=="AGREGADA"||partida.tipo=="MODIFICADA"||partida.tipo == "NORMAL") && (partida.status == "ASIGNADA" || partida.status == "WAITINGARRIVAL"))
                {
                    arrpartida.push(partida);
                }
            });
            console.log(arrpartida.length);
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
            console.log(partidas.length);
            let arrpartida=[];
            await Helper.asyncForEach(partidas, async function (partida) 
            {
                if(partida.tipo == "NORMAL" && partida.status == "ASIGNADA" )
                {
                    arrpartida.push(partida);
                }
            });
            console.log(arrpartida.length);
            res.status(200).send(arrpartida);
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send(error);
        });
}

async function getBySalida(req, res) {
    let salida_id = req.params.salida_id;
    let salida = await Salida.findOne({ _id: salida_id }).exec();
    let partidas_id = salida.partidas;

    let partidas = [];

    await Helper.asyncForEach(partidas_id, async function (partida_id) {
        let partidaFound = await Partida.findOne({ _id: partida_id }).exec();
        let partida = JSON.parse(JSON.stringify(partidaFound));
        let salida_idFound = partida.salidas_id.find(x => x.salida_id.toString() == salida_id.toString());
        partida.pesoBrutoEnSalida = salida_idFound.pesoBruto;
        partida.pesoNetoEnSalida = salida_idFound.pesoNeto;
        partida.embalajesEnSalida = salida_idFound.embalajes;
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

    console.log("test");

    /**
     * Se obtienen las partidas necesarias para la cantidad deseada
     * Se obtienen las partidas que no estan vacias, que tienen existencias por salir
     * del embalaje solicitado y se ordenan de forma ascendente, de la mas antigua a la mas reciente
     * Filtros utilizados: producto_id, isEmpty, clienteFiscal_id, sucursal_id, almacen_id
     *
     */
    let partidas = await Partida
        .find({ producto_id: producto_id, isEmpty: false , tipo:"NORMAL",status:"ASIGNADA"})
        .populate('entrada_id', 'fechaEntrada clienteFiscal_id sucursal_id almacen_id tipo',
            {
                clienteFiscal_id: clienteFiscal_id,
                sucursal_id: sucursal_id,
                almacen_id: almacen_id
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
                        producto_id: producto_id,
                        ubicacion_id: posicion._id,
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
                    if(auxPartida.tipoentrada == "NORMAL")
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
                            producto_id: producto_id,
                            ubicacion_id: posicion._id,
                            posicionesFull: Helper.Clone(partida.posiciones),
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
                            producto_id: producto_id,
                            ubicacion_id: posicion._id,
                            posicionesFull: Helper.Clone(partida.posiciones),
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

        let partidas = await Partida
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
                select: 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista fechaAlta'
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
            .exec();
            //console.log(partidas)
            partidas = partidas.sort(sortByfechaEntadaAsc);
            let arrPartidas=[]
            partidas.forEach(partida => 
            {
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
                if(resFecha==true && resClasificacion==true && resSubclasificacion ==true && resClave==true && (partida.tipo=="NORMAL" || partida.tipo=="AGREGADA" || partida.tipo=="MODIFICADA"))
                    arrPartidas.push(partida);
            });
        
        res.status(200).send(arrPartidas);
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
    console.log("1")
    worksheet.cell(2, indexheaders).string('Fecha Ingreso').style(headersStyle);
    worksheet.cell(2, indexheaders+1).string('Fecha Alta Ingreso').style(headersStyle);
    worksheet.cell(2, indexheaders+2).string('Fecha Despacho').style(headersStyle);
    worksheet.cell(2, indexheaders+3).string('Fecha Alta Despacho').style(headersStyle);    
    worksheet.cell(2, indexheaders+4).string('% Salida').style(headersStyle);
    worksheet.cell(2, indexheaders+5).string('Lapso').style(headersStyle);
    worksheet.cell(2, indexheaders+6).string('Recibio').style(headersStyle);
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

        let entradas = await Entrada.find(filter).exec();

        let entradas_id = entradas.map(x => x._id);

        let partidas = await Partida
            .find({ entrada_id: { $in: entradas_id }, tipo: tipo })
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
            .exec();
            partidas = partidas.sort(sortByfechaEntadaAsc);
            let arrPartidas=[]
            partidas.forEach(partida => 
            {
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
                if(resFecha==true && resClasificacion==true && resSubclasificacion ==true && resClave==true && (partida.tipo=="NORMAL" || partida.tipo=="AGREGADA" || partida.tipo=="MODIFICADA"))
                {   
                    //console.log(partida.entrada_id.tipo);
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
                                var diff = Math.abs(max.getTime() - partida.entrada_id.fechaEntrada.getTime());
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
                    worksheet.cell(i, 1).string(partida.entrada_id.stringFolio ? partida.entrada_id.stringFolio:"");
                    worksheet.cell(i, 2).string(partida.salidas_id.length > 0  ? partida.salidas_id[0].salida_id.stringFolio: "");
                    worksheet.cell(i, 3).string(partida.entrada_id.tipo ? partida.entrada_id.tipo:"");
                    worksheet.cell(i, 4).string(partida.entrada_id.item ? partida.entrada_id.item:"");
                    worksheet.cell(i, 5).string(partida.entrada_id.referencia ? partida.entrada_id.referencia :"");
                    worksheet.cell(i, 6).string(partida.clave ? partida.clave:"");
                    worksheet.cell(i, 7).string(partida.entrada_id.ordenCompra ? partida.entrada_id.ordenCompra:"");
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
                    worksheet.cell(i, indexbody).string(partida.entrada_id.fechaEntrada ? dateFormat(partida.entrada_id.fechaEntrada, formatofecha) : "");
                    worksheet.cell(i, indexbody+1).string(partida.entrada_id.fechaAlta ? dateFormat(partida.entrada_id.fechaAlta, formatofecha) : "");
                    worksheet.cell(i, indexbody+2).string(partida.salidas_id != undefined ? partida.salidas_id[0]!=undefined ? dateFormat(partida.salidas_id[0].salida_id.fechaSalida, formatofecha) : "":"");
                    worksheet.cell(i, indexbody+3).string(partida.salidas_id != undefined ? partida.salidas_id[0]!=undefined ? dateFormat(partida.salidas_id[0].salida_id.fechaAlta, formatofecha) : "":"");
                    worksheet.cell(i, indexbody+4).number(isNaN(porcentaje)? 0 :porcentaje).style(porcentajeStyle);
                    worksheet.cell(i, indexbody+5).string(lapso).style(fitcellStyle);
                    worksheet.cell(i, indexbody+6).string(partida.entrada_id.recibio ? partida.entrada_id.recibio:"");
                    i++;
                }
            });
        workbook.write('ReportePartidas'+dateFormat(Date.now(), formatofecha)+'.xlsx',res);
    }
    catch (error) {
       // console.log(error);
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
module.exports = {
    get,
    post,
    addSalida,
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
    getExcelByIDs
}