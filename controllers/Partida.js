'use strict'

const Partida = require('../models/Partida');
const Salida = require('../models/Salida');
const Entrada = require('../models/Entrada');
const EmbalajesModel = require('../models/Embalaje');
const Helper = require('../helpers');
const NullParamsException = { error: "NullParamsException" };
const BreakException = { info: "Break" };

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
        .then((partidas) => {
            res.status(200).send(partidas);
        })
        .catch((error) => {
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

    await Helper.asyncForEach(arrPartidas, async function (partida) {
        console.log(partida);
        let nPartida = new Partida(partida);
        nPartida.entrada_id = entrada_id;
        await nPartida.save().then((partida) => {
            arrPartidas_id.push(partida._id);
        });
    });
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
    await Helper.asyncForEach(arrPartidas_id, async function (partida_id) {
        await Partida.updateOne({ _id: partida_id }, { $set: { entrada_id: entrada_id, status: "ASIGNADA" } }).exec();
    });
}

function isEmptyPartida(partida) {
    let contEmbalajesCero = 0;
    let tamEmbalajes = 0;

    for (let embalaje in partida.embalajesxSalir) { tamEmbalajes += 1; } //Se obtiene la cantidad de embalajes
    for (let embalaje in partida.embalajesxSalir) {  //Obtiene la cantidad de embalajes con cero
        if (partida.embalajesxSalir[embalaje] == 0) contEmbalajesCero += 1;
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

    /**
     * Se obtienen las partidas necesarias para la cantidad deseada
     * Se obtienen las partidas que no estan vacias, que tienen existencias por salir
     * del embalaje solicitado y se ordenan de forma ascendente, de la mas antigua a la mas reciente
     * Filtros utilizados: producto_id, isEmpty, clienteFiscal_id, sucursal_id, almacen_id
     *
     */
    let partidas = await Partida
        .find({ producto_id: producto_id, isEmpty: false })
        .populate('entrada_id', 'fechaEntrada clienteFiscal_id sucursal_id almacen_id',
            {
                clienteFiscal_id: clienteFiscal_id,
                sucursal_id: sucursal_id,
                almacen_id: almacen_id
            })
        .where(embalajesxSalir).gt(0)
        .exec();

    partidas = partidas.filter(x => x.entrada_id != undefined && x.entrada_id.clienteFiscal_id == clienteFiscal_id && x.entrada_id.sucursal_id == sucursal_id && x.entrada_id.almacen_id == almacen_id);

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
            partidas = partidas.sort(function (a, b) {
                if (new Date(a.entrada_id.fechaEntrada) < new Date(b.entrada_id.fechaEntrada)) return -1;
                if (new Date(a.entrada_id.fechaEntrada) > new Date(b.entrada_id.fechaEntrada)) return 1;
                else {
                    if (algoritmoSalida.length > 1) {
                        if (algoritmoSalida[1].algoritmo === "CADUCIDAD") {
                            if (new Date(a.fechaCaducidad) < new Date(b.fechaCaducidad)) return -1;
                            else if (new Date(a.fechaCaducidad) > new Date(b.fechaCaducidad)) return 1;
                        }
                    }
                    return 0;
                }
            });
        else if (algoritmoSalida[0].algoritmo === "CADUCIDAD")
            partidas = partidas.sort(function (a, b) {
                if (new Date(a.fechaCaducidad) < new Date(b.fechaCaducidad)) return -1;
                if (new Date(a.fechaCaducidad) > new Date(b.fechaCaducidad)) return 1;
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

    let partidasActuales = [];

    try {
        //Validacion para Clientes fiscales que no utilicen ningun algoritmo
        console.log(algoritmoSalida === undefined || algoritmoSalida.length < 1);
        if (algoritmoSalida === undefined || algoritmoSalida.length < 1) {
            partidas.forEach(partida => {
                let subConsecutivo = 0;
                //console.log("Posiciones", partida.posiciones.filter(x => !x.isEmpty));
                partida.posiciones.filter(x => !x.isEmpty).forEach(posicion => {
                    console.log("Posicion n", posicion.nivel)
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
                        entrada_id: partida.entrada_id != undefined ? partida.entrada_id._id : ""
                    };
                    //console.log(auxPartida);
                    subConsecutivo += 1;
                    partidasActuales.push(auxPartida);
                });
            });

            throw BreakException;
        }

        /**
         * Se obtienen las partidas por posicion, y se determina la cantidad de salida
         * del embalaje para cada posicion, dependiendo de su disponibilidad
         */

        console.log("Cantidad restante", cantidadRestante);
        partidas.forEach(partida => {
            let subConsecutivo = 0;

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
    let arrClientesFiscales_id = req.query.arrClientesFiscales_id;
    let arrSucursales_id = req.query.arrSucursales_id;
    let arrAlmacenes_id = req.query.arrAlmacenes_id;
    let fechaInicio = req.query.fechaInicio;
    let fechaFinal = req.query.fechaFinal;
    let tipo = req.query.tipo;

    try {
        if (arrClientesFiscales_id == undefined || arrClientesFiscales_id.length == 0) throw NullParamsException;
        if (arrSucursales_id == undefined || arrSucursales_id.length == 0) throw NullParamsException;
        if (arrAlmacenes_id == undefined || arrAlmacenes_id.length == 0) throw NullParamsException;
        if (tipo == undefined || tipo == "") throw NullParamsException;

        let filtro = {
            clienteFiscal_id: { $in: arrClientesFiscales_id },
            sucursal_id: { $in: arrSucursales_id },
            almacen_id: { $in: arrAlmacenes_id }
        };

        if (fechaInicio != undefined && fechaFinal != undefined) {
            filtro['fechaEntrada'] = { $gte: fechaInicio, $lt: fechaFinal };
        }

        let entradas = await Entrada.find(filtro).exec();
        let entradas_id = entradas.map(x => x._id);

        let partidas = await Partida
            .find({ entrada_id: { $in: entradas_id }, tipo: tipo })
            .populate({
                path: "entrada_id",
                model: "Entrada",
                populate: {
                    path: "clienteFiscal_id",
                    model: "ClienteFiscal",
                    select: 'nombreCorto nombreComercial razonSocial'
                },
                select: 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista'
            })
            .populate({
                path: "entrada_id",
                model: "Entrada",
                populate: {
                    path: "sucursal_id",
                    model: "Sucursal",
                    select: 'nombre'
                },
                select: 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista'
            })
            .populate({
                path: "entrada_id",
                model: "Entrada",
                populate: {
                    path: "almacen_id",
                    model: "Almacen",
                    select: 'nombre'
                },
                select: 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista'
            })
            .populate({
                path: 'salidas_id.salida_id',
                model: 'Salida',
                select: 'folio stringFolio fechaSalida item'
            })
            .exec();

        partidas = partidas.sort(sortByfechaEntadaAsc);
        res.status(200).send(partidas);
    }
    catch (error) {
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
            let nPartida = new Partida(partida);
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

async function posicionar(partidas) {
    let pasilloBahia = await Pasillo.findOne({
        isBahia: true,
        statusReg: "ACTIVO"
    }).populate({
        path: 'posiciones.posicion_id'
    }).exec();
    //console.log(pasilloBahia);

    let posicionBahia = pasilloBahia.posiciones[0].posicion_id;
    //console.log(posicionBahia);

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
            //console.log(partida);

            await Partida.updateOne({ _id: partida._id }, { $set: { posiciones: partida.posiciones } });
        }
    }
}

function _put(jNewPartida) {
    Partida.findOne({ _id: jNewPartida._id })
        .then(async (partida) => {
            console.log(partida);
            console.log(jNewPartida);

            // let isEquals = await equalsEmbalajes(partida, jNewPartida);
            // partida.lote = jNewPartida.lote;
            // partida.producto_id = jNewPartida.producto_id;
            // partida.clave
            // if (!isEquals) {
            //     //await updatePartidaEmbalajes(partida, bodyParams);
            //     //let resMovimietno = await updateMovimiento(entrada_id, clave_partida, bodyParams);
            //     //console.log(resMovimietno);
            // }
            // if (partida.posiciones != bodyParams.posiciones) {
            //     console.log("Posicion");
            //     partida.posiciones = bodyParams.posiciones;
            // }
            // if (partida.valor != bodyParams.valor) {
            //     console.log("Valor");
            //     partida.valor = bodyParams.valor;
            // }

            await Partida.updateOne({ _id: partida._id }, { $set: jNewPartida }).exec();
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

//Campara los embalajes actuales con los nuevos para determinar el signo
// false = diferentes
// true = iguales
// async function equalsEmbalajes(partida, jNewPartida) {
//     let embalajes = await getEmbalajes();
//     let res = true;
//     for (let embalaje of embalajes) {
//         if (jNewPartida.embalajes[embalaje.clave] == undefined)
//             jNewPartida.embalajes[embalaje.clave] = 0;

//         if (partida.embalajesEntrada[embalaje.clave] == undefined)
//             partida.embalajesEntrada[embalaje.clave] = 0;

//         if (partida.embalajesEntrada[embalaje.clave] != jNewPartida.embalajes[embalaje.clave]) {
//             res = false;
//             break;
//         }
//     }
//     return await res;
// }

// async function getEmbalajes() {
//     let res;
//     res = await EmbalajesModel.find({ status: "ACTIVO" }).exec();
//     return res;
// }


// async function updatePartidaEmbalajes(partida, bodyParams) {
//     //console.log("Embalajes");
//     let embalajes = await getEmbalajes();

//     for (let embalaje of embalajes) {
//         if (bodyParams.embalajes[embalaje.clave] == undefined)
//             bodyParams.embalajes[embalaje.clave] = 0;

//         if (partida.embalajes[embalaje.clave] == undefined)
//             partida.embalajes[embalaje.clave] = 0;

//         partida.embalajes[embalaje.clave] = bodyParams.embalajes[embalaje.clave];
//     }
// }

//Updatea los cambios hechos en la partida en su respectivo movimiento
// async function updateMovimiento(entrada_id, clave_partida, bodyParams) {
//     let itemMovimiento = {
//         embalajes: bodyParams.embalajes,
//         pesoBruto: bodyParams.pesoBruto,
//         pesoNeto: bodyParams.pesoNeto,
//         pasillo: bodyParams.pasillo,
//         pasillo_id: bodyParams.pasillo_id,
//         posicion: bodyParams.posicion,
//         posicion_id: bodyParams.posicion_id,
//         nivel: bodyParams.nivel,
//     };

//     await MovimientoInventarioModel.updateOne({ entrada_id: entrada_id, clave_partida: clave_partida }, { $set: itemMovimiento })
//         .then((item) => {
//             return true;
//         })
//         .catch((error) => {
//             return false;
//         });
// }

module.exports = {
    get,
    post,
    addSalida,
    getByEntrada,
    getBySalida,
    put,
    getByProductoEmbalaje,
    getPartidasByIDs,
    save,
    getByPedido,
    _update,
    posicionar,
    _put,
    updateForSalidaAutomatica,
    asignarEntrada
}