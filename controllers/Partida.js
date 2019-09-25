'use strict'

const Partida = require('../models/Partida');
const Salida = require('../models/Salida');
const Helper = require('../helpers');
const Entrada = require('../models/Entrada');
const NullParamsException = {error: "NullParamsException"};
const BreakException = {info : "Break"};

function get(req,res){
    let encoded_filter = req.params.filtro;
    var buff;
    var data_filter;
    var json_filter;

    try
    {
        buff = new Buffer(encoded_filter,'base64');
        data_filter = buff.toString('ascii');

        json_filter = JSON.parse(data_filter);

        Partida.find(json_filter)
        .populate('entrada_id','fechaEntrada fechaAlta','Entrada')
        .then((partidas)=>{
            res.status(200).send(partidas);
        })
        .catch((error)=>{
            res.status(500).send(error);
        });
    }
    catch(error){
        res.status(500).send(error);
    }
    
    
}

async function put(arrPartidas,salida_id){

    /**
     * Guarda para cada partida, las cantidades restantes y updatea la Entrada isEmpty a true
     * si todas las partidas estan vacias
     */

    var arrPartidas_id = [];
    let entradas_id = arrPartidas.length > 0 ? arrPartidas.map(x=> x.entrada_id) : undefined;
    
    await Helper.asyncForEach(arrPartidas,async function(partida){

        arrPartidas_id.push(partida._id);
        let jsonSalida_id = {
            salida_id : salida_id,
            embalajes : partida.embalajesEnSalida,
            salidaxPosiciones : partida.embalajesEnSalidaxPosicion
        };

        let partidaFound = await Partida.findOne({_id : partida._id});

        if(partidaFound){    
            partidaFound.salidas_id.push(jsonSalida_id);

            let changes = {
                salidas_id : partidaFound.salidas_id,
                embalajesxSalir : partida.embalajesxSalir,
                posiciones: partida.posiciones,
                isEmpty : partida.isEmpty
            };

            await Partida.updateOne({_id: partidaFound._id},{$set : changes}).exec();
        }

    });

    Helper.asyncForEach(entradas_id,async function(entrada_id){
        await setIsEmptyEntrada(entrada_id);
    });

    return arrPartidas_id;
}

async function post(arrPartidas,entrada_id){

    var arrPartidas_id = [];
    
    await Helper.asyncForEach(arrPartidas,async function(partida){
        let nPartida = new Partida(partida);  
        nPartida.entrada_id = entrada_id;  
        await nPartida.save().then((partida)=>{
            arrPartidas_id.push(partida._id);
        });
    });
    return arrPartidas_id;

}

async function addSalida(salida,_id){
    
    await Partida.findOne({_id:_id}).then((partida)=>{

        partida.salidas_id.push(salida);
        partida.save();
        
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

async function getByEntrada(req,res){
    let entrada_id = req.params.entrada_id;

    Partida.find({entrada_id:entrada_id})
    .then((partidas)=>{
        res.status(200).send(partidas);
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

async function getBySalida(req,res){
    let salida_id = req.params.salida_id;
    let salida = await Salida.findOne({_id: salida_id}).exec();
    let partidas_id = salida.partidas;

    let partidas = [];

    await Helper.asyncForEach(partidas_id,async function(partida_id){
        let partidaFound = await Partida.findOne({_id: partida_id}).exec();
        let partida = JSON.parse(JSON.stringify(partidaFound));
        let salida_idFound = partida.salidas_id.find(x=> x.salida_id.toString() == salida_id.toString());
        partida.pesoBrutoEnSalida = salida_idFound.pesoBruto;
        partida.pesoNetoEnSalida = salida_idFound.pesoNeto;
        partida.embalajesEnSalida = salida_idFound.embalajes;
        partidas.push(partida);
    });

    res.status(200).send(partidas);
}


function isEmptyPartida(partida){
	let contEmbalajesCero = 0;
	let tamEmbalajes = 0;

	for(let embalaje in partida.embalajesxSalir){tamEmbalajes+=1;} //Se obtiene la cantidad de embalajes
	for(let embalaje in partida.embalajesxSalir){  //Obtiene la cantidad de embalajes con cero
		if(partida.embalajesxSalir[embalaje]==0) contEmbalajesCero+=1; 
	}

	// Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
	if(tamEmbalajes == contEmbalajesCero) 
		return true;
	else
		return false;
}

async function isEmptyPartidas(entrada_id){
    let partidas = await Partida.find({entrada_id : entrada_id}).exec();
	let tamPartidas = partidas.length;
	let conPartidasCero = 0;

	partidas.forEach(function(partida){
		if(isEmptyPartida(partida)) conPartidasCero+=1; //Obtiene la cantidad de partidas en cero
	});

	if (tamPartidas == conPartidasCero) //Si el total de partidas es igual al total de partidas con cero
		return true;
	else
		return false;
}

async function setIsEmptyEntrada(entrada_id){
    if(entrada_id){
        let bisEmptyPartidas = await isEmptyPartidas(entrada_id);

        if(bisEmptyPartidas){
            await Entrada.updateOne({_id : entrada_id},{$set: {isEmpty : true,status: "FINALIZADO" }}).exec();
        }
    }
}

async function getByProductoEmbalaje(req,res){

    /**
     * Obtiene las partidas por SKU, y genera los embalajes que se sacaran dependiendo
     * de la disponibilidad de los embalajes existentes
     */
    
    let producto_id = req.params.producto_id; //Hexa
    let embalaje = req.params.embalaje; //tarimas, piezas
    let embalajesxSalir = "embalajesxSalir." + embalaje; //"embalajesxSalir.tarimas"
    let clienteFiscal_id = req.params.clienteFiscal_id; //He
    let sucursal_id = req.params.sucursal_id;
    let almacen_id = req.params.almacen_id;
    let cantidad = req.params.cantidad;  
    let cantidadRestante = parseFloat(cantidad);
    let isPEPS = req.params.isPEPS;

    

    /**
     * Se obtienen las partidas necesarias para la cantidad deseada
     * Se obtienen las partidas que no estan vacias, que tienen existencias por salir
     * del embalaje solicitado y se ordenan de forma ascendente, de la mas antigua a la mas reciente
     * Filtros utilizados: producto_id, isEmpty, clienteFiscal_id, sucursal_id, almacen_id
     *
     */
    let partidas = await Partida
    .find({producto_id : producto_id, isEmpty : false})
    .populate('entrada_id','fechaEntrada clienteFiscal_id sucursal_id almacen_id',
    {
        clienteFiscal_id : clienteFiscal_id, 
        sucursal_id: sucursal_id, 
        almacen_id: almacen_id
    })
    .where(embalajesxSalir).gt(0)
    .exec();
    partidas = partidas.filter(x=> x.entrada_id != undefined && x.entrada_id.clienteFiscal_id == clienteFiscal_id 
        && x.entrada_id.sucursal_id == sucursal_id && x.entrada_id.almacen_id == almacen_id );

    
    partidas = partidas.sort(sortByfechaEntadaAsc);
    
    let partidasActuales = [];

    try
    {
        //Validacion para Clientes fiscales que no utilicen algoritmo PEPS
        console.log("isPEPS",isPEPS,isPEPS == false.toString());
        if(isPEPS == false.toString())
        {
            partidas.forEach(partida=> {
                let subConsecutivo = 0;
                console.log(partida.lote);
                partida.posiciones.filter(x=> !x.isEmpty).forEach(posicion=>{
                    let auxPartida = {
                        lote : partida.lote,
                        clave : partida.clave,
                        descripcion : partida.descripcion,
                        isEmpty : partida.isEmpty,
                        _id : partida._id,
                        _idLocal : partida._id + '/' + subConsecutivo,
                        embalajesEntradaFull : Helper.Clone(partida.embalajesEntrada),
                        embalajesxSalirFull : Helper.Clone(partida.embalajesxSalir),
                        embalajesEntrada : Helper.Clone(posicion.embalajesxSalir),
                        embalajesxSalir : Helper.Clone(posicion.embalajesxSalir),
                        embalajesEnSalida : Helper.emptyEmbalajes(posicion.embalajesxSalir),
                        posicion_id : posicion.posicion_id,
                        posicion : posicion.posicion,
                        pasillo_id : posicion.pasillo_id,
                        pasillo : posicion.pasillo,
                        nivel_id : posicion.nivel_id,
                        nivel : posicion.nivel,
                        producto_id: producto_id,
                        ubicacion_id : posicion._id,
                        posicionesFull : Helper.Clone(partida.posiciones),
                        posiciones : [partida.posiciones.find(x=> x._id.toString() === posicion._id.toString())],
                        subConsecutivo : subConsecutivo,
                        fechaEntrada : partida.entrada_id != undefined ? partida.entrada_id.fechaEntrada : "",
                        entrada_id : partida.entrada_id != undefined ? partida.entrada_id._id : ""
                    };

                    subConsecutivo+=1;
                    partidasActuales.push(auxPartida);
                });
            });

            throw BreakException;
        }

        /**
         * Se obtienen las partidas por posicion, y se determina la cantidad de salida
         * del embalaje para cada posicion, dependiendo de su disponibilidad
         */
    
        console.log(cantidadRestante);
        partidas.forEach(partida=> {
            let subConsecutivo = 0;
            
            partida.posiciones.filter(x=> !x.isEmpty).forEach(posicion=>{
                
              if(cantidadRestante > 0){
                 let auxPartida = {
                     lote : partida.lote,
                     clave : partida.clave,
                     descripcion : partida.descripcion,
                     isEmpty : partida.isEmpty,
                    _id : partida._id,
                    _idLocal : partida._id + '/' + subConsecutivo,
                    embalajesEntradaFull : Helper.Clone(partida.embalajesEntrada),
                    embalajesxSalirFull : Helper.Clone(partida.embalajesxSalir),
                    embalajesEntrada : Helper.Clone(posicion.embalajesxSalir),
                    embalajesxSalir : Helper.Clone(posicion.embalajesxSalir),
                    embalajesEnSalida : Helper.emptyEmbalajes(posicion.embalajesxSalir),
                    posicion_id : posicion.posicion_id,
                    posicion : posicion.posicion,
                    pasillo_id : posicion.pasillo_id,
                    pasillo : posicion.pasillo,
                    nivel_id : posicion.nivel_id,
                    nivel : posicion.nivel,
                    producto_id: producto_id,
                    ubicacion_id : posicion._id,
                    posicionesFull : Helper.Clone(partida.posiciones),
                    posiciones : [partida.posiciones.find(x=> x._id.toString() === posicion._id.toString())],
                    subConsecutivo : subConsecutivo,
                    fechaEntrada : partida.entrada_id != undefined ? partida.entrada_id.fechaEntrada : "",
                    entrada_id : partida.entrada_id != undefined ? partida.entrada_id._id : ""
                 };
                 
                 if(cantidadRestante >= auxPartida.embalajesxSalir[embalaje]){
                    auxPartida.embalajesEnSalida[embalaje] = auxPartida.embalajesxSalir[embalaje];
                    auxPartida.embalajesxSalir[embalaje] = 0;
                    auxPartida.posiciones[0].embalajesxSalir[embalaje] = 0;
                    auxPartida.posiciones[0].isEmpty = Helper.isEmptyEmbalaje(auxPartida.posiciones[0].embalajesxSalir);
                    
                 }else{
                    
                    auxPartida.embalajesEnSalida[embalaje] = cantidadRestante;
                    auxPartida.embalajesxSalir[embalaje] -= cantidadRestante;
                    auxPartida.posiciones[0].embalajesxSalir[embalaje]-=cantidadRestante;
                 }
                 
                 subConsecutivo+=1;
                 partidasActuales.push(auxPartida);
                 cantidadRestante-=auxPartida.embalajesEnSalida[embalaje];
              }else{
                  //Si no hay mas que sacar entonces simplemente termina
                 throw BreakException;
              }
          });
        });
        //Si los ciclos han terminado entonces se lanza  la excepcion de finalización.
        //Puesto que ya no hay partidas disponibles
        throw BreakException;
    }
    catch(e){
        if(e == BreakException){
            res.status(200).send(partidasActuales);
        }else
        {
            res.status(500).send(e);
        }
    }
}

async function getPartidasByIDs(req,res){

    /**
     * Obtiene las partidas con respecto a los filtros de cliente fiscal, sucursal y almacen
     */
    
    
    let arrClientesFiscales_id = req.query.arrClientesFiscales_id; 
    let arrSucursales_id = req.query.arrSucursales_id;
    let arrAlmacenes_id = req.query.arrAlmacenes_id;
    let fechaInicio = req.query.fechaInicio;
    let fechaFinal = req.query.fechaFinal;
    let tipo = req.query.tipo;
    
    try
    {
        if(arrClientesFiscales_id == undefined || arrClientesFiscales_id.length == 0) throw NullParamsException;
        if(arrSucursales_id == undefined || arrSucursales_id.length == 0) throw NullParamsException;
        if(arrAlmacenes_id == undefined || arrAlmacenes_id.length == 0) throw NullParamsException;
        if(tipo == undefined || tipo == "") throw NullParamsException;
        
        let filtro = {
            clienteFiscal_id : {$in: arrClientesFiscales_id } ,
            sucursal_id : {$in: arrSucursales_id },
            almacen_id : {$in: arrAlmacenes_id}
        };

        if(fechaInicio != undefined && fechaFinal != undefined) {
            filtro['fechaEntrada'] = { $gte : fechaInicio , $lt : fechaFinal };
        }

        let entradas = await Entrada.find(filtro).exec();
        let entradas_id = entradas.map(x=> x._id);
        
        let partidas = await Partida
        .find({entrada_id : {$in : entradas_id},tipo : tipo })
        .populate({
           path: "entrada_id" ,
           model : "Entrada",
           populate : {
               path: "clienteFiscal_id",
               model: "ClienteFiscal",
               select : 'nombreCorto nombreComercial razonSocial'
           },
           select : 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista'
        })
        .populate({
            path: "entrada_id" ,
            model : "Entrada",
            populate : {
                path: "sucursal_id",
                model: "Sucursal",
                select : 'nombre'
            },
            select : 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista'
         })
         .populate({
            path: "entrada_id" ,
            model : "Entrada",
            populate : {
                path: "almacen_id",
                model: "Almacen",
                select : 'nombre'
            },
            select : 'fechaEntrada clienteFiscal_id sucursal_id almacen_id stringFolio folio referencia embarque item recibio proveedor ordenCompra factura tracto remolque transportista'
         })
         .populate({
             path: 'salidas_id.salida_id',
             model : 'Salida',
             select : 'folio stringFolio fechaSalida item'
         })
        .exec();

        partidas = partidas.sort(sortByfechaEntadaAsc);
        res.status(200).send(partidas);
    }
    catch(error){
        res.status(500).send(error);
    }
}

function sortByfechaEntadaDesc(a,b){
    if(a.entrada_id.fechaEntrada < b.entrada_id.fechaEntrada){
        return 1;
    }
    if(a.entrada_id.fechaEntrada > b.entrada_id.fechaEntrada){
        return -1;
    }

    return 0;
}

function sortByfechaEntadaAsc(a,b){
    if(a.fechaEntrada == undefined || a.fechaEntrada == null || b.fechaEntrada == undefined || b.fechaEntrada == null){
        return -1;
    }
    if(a.entrada_id.fechaEntrada < b.entrada_id.fechaEntrada){
        return -1;
    }
    if(a.entrada_id.fechaEntrada > b.entrada_id.fechaEntrada){
        return 1;
    }

    return 0;
}

async function save(req,res){

    /**
     * Esta funcion es utilizada para guardar las partidas generadas desde un pedido
     * en la plataforma de Crossdock (XD)
     */

    try
    {
        var arrPartidas_id = [];
        let arrPartidas = req.body.partidas;
        await Helper.asyncForEach(arrPartidas,async function(partida){
            let nPartida = new Partida(partida); 
            nPartida.origen = "XD";
            nPartida.tipo = "PEDIDO";
            await nPartida.save().then((partida)=>{
                arrPartidas_id.push(partida._id);
            });
        });
        return arrPartidas_id;
    }
    catch(e)
    {
        res.status(500).send(e);
    }
}

async function getByPedido(req,res){

    /**
     * Esta funcion obtiene las partidas que fueron creadas
     * a partir de pedidos en la plataforma Crossdock (XD)
     */

    try
    {
        console.log(req.params.IDPedido);
        Partida.find({'InfoPedidos.IDPedido' : req.params.IDPedido}).then(function(partidas){
            let NPartidas = [];
            partidas.forEach(partida=>{
                let NPartida = JSON.parse(JSON.stringify(partida));
                NPartida.embalajesxPedido = NPartida.InfoPedidos.find(x=> x.IDPedido == req.params.IDPedido).embalajes;
                NPartidas.push(NPartida);
            });
            res.status(200).send(NPartidas);
        });
    }
    catch(e){
        res.status(500).send(e);
    }
}

async function update(req,res){

    /**
     * Esta funcion actualiza las existencias de la partida
     * por un monto menor en cantidad de los embalajes
     * Se utiliza al hacer un pedido con partidas ya existentes.
     * Indicando que ese pedido es para una salida en ALM
     */

     try
     {
        let arrPartidas = req.body.partidas;
        await Helper.asyncForEach(arrPartidas,async function(partida){
            
            let changes = {
                embalajesAlmacen : partida.embalajesAlmacen,
                embalajesxSalir : partida.embalajesxSalir,
                InfoPedidos : partida.InfoPedidos,
                isEmpty : partida.isEmpty,
                posiciones : partida.posiciones
            };

            Partida.updateOne({_id : partida._id.toString()},{$set : changes}).then(updated=>{
                res.status(200).send(updated);
            });
        });

     }
     catch(e){
         res.status(500).send(e);
     }

}

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
    update
}