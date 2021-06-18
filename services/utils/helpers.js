//const PDF = require('pdfkit');
const Entrada = require('../../apiServices/Entradas/Entrada.model');
const Partida = require('../../apiServices/Partida/Partida.model');
const Salida = require('../../apiServices/Salidas/Salida.model');
const Embalaje = require('../../apiServices/Embalaje/Embalaje.model');
const MovimientoInventario = require('../../apiServices/MovimientosInventario/MovimientoInventario.model');
const Interfaz_ALM_XD = require('../../apiServices/Interfaz_ALM_XD/Interfaz_ALM_XD.model');
const ClienteFiscal = require('../../apiServices/ClientesFiscales/ClienteFiscal.model');
const fs = require('fs');
const moment = require('moment');
const blobstream = require('blob-stream');

//const configSQL = (require('../../configSQL'));
const configSQL = require('../../config/env/index')

const sql = require('mssql');

const distinct = (value, index, self) => {
	return self.indexOf(value) === index;
};

//sql.close();
//Se conecta a la base de datos en SQL conexion global

async function getPartidasByIDs(req, res) {

	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let _tipo = req.query.tipoMovimiento;
	let fechaI = req.query.fechaInicio;
	let fechaF = req.query.fechaFinal;
	let tipo = req.query.tipo;


	if (fechaI == null) {
		let infoPartidasGrl = await getPartidas(_arrClientesFiscales, _arrSucursales, _arrAlmacenes, _tipo);
		await res.status(200).send(infoPartidasGrl);
	} else {
		let infoPartidasFiltro = await getPartidasFiltro(_arrClientesFiscales, _arrSucursales, _arrAlmacenes, fechaI, fechaF, tipo, _tipo);
		await res.status(200).send(infoPartidasFiltro);
	}

}

async function getPartidasFiltro(_arrClientesFiscales, _arrSucursales, _arrAlmacenes, fechaI, fechaF, tipo, _tipo) {
	let infoPartidasFiltro = [];
	let boolFechas = fechaI == fechaF;

	let rango = {
		$gte: new Date(fechaI),
		$lt: new Date(fechaF)
	};

	let filtroEntrada = {
		clienteFiscal_id: { $in: _arrClientesFiscales },
		idSucursal: { $in: _arrSucursales },
		almacen_id: { $in: _arrAlmacenes },
		tipo: _tipo
	};
	let filtroSalida = {
		clienteFiscal_id: { $in: _arrClientesFiscales },
		idSucursal: { $in: _arrSucursales },
		almacen_id: { $in: _arrAlmacenes },
		tipo: _tipo
	};
	if (!boolFechas) {
		filtroEntrada["fechaEntrada"] = rango;
		filtroSalida["fechaSalida"] = rango;
	}

	if (tipo == "ENTRADA") {
		let partidasEntrada = await getPartidasEntradas(filtroEntrada);
		infoPartidasFiltro = partidasEntrada;
	} else if (tipo == "SALIDA") {
		let partidasSalida = await getPartidasSalidas(filtroSalida);
		infoPartidasFiltro = partidasSalida;
	} else {
		let partidasEntrada = await getPartidasEntradas(filtroEntrada);
		let partidasSalida = await getPartidasSalidas(filtroSalida);
		infoPartidasFiltro = partidasEntrada.concat(partidasSalida);
	}


	return infoPartidasFiltro;
}

async function getPartidas(_arrClientesFiscales, _arrSucursales, _arrAlmacenes, _tipo) {
	let infoPartidasGrl = [];

	let filtro = {
		clienteFiscal_id: { $in: _arrClientesFiscales },
		idSucursal: { $in: _arrSucursales },
		almacen_id: { $in: _arrAlmacenes },
		tipo: _tipo
	};

	let partidasEntrada = await getPartidasEntradas(filtro);
	//console.log(filtro);

	//let partidasSalida = await getPartidasSalidas(filtro);

	//infoPartidasGrl = partidasEntrada.concat(partidasSalida);
	//return infoPartidasGrl;
	return partidasEntrada;
}

async function getPartidasEntradas(filtro) {

	/**
	 * Esta funcion obtiene las partidas de las entradas con el filtro dado
	 */
	let infoPartidasEntradas = [];





	// let entradas = await Entrada.find(filtro)
	// 	.populate({
	// 		path:'partidas.producto_id',
	// 		model:'Producto'
	// 	})
	// 	.populate({
	// 		path:'clienteFiscal_id',
	// 		model:'ClienteFiscal'
	// 	})
	// 	.populate({
	// 		path:'almacen_id',
	// 		model:'Almacen'
	// 	})
	// 	.populate({
	// 		path:'salidas_id',
	// 		model:'Salida'
	// 	})
	// 	.exec();

	return infoPartidasEntradas;

}
async function getPartidasSalidas(filtro) {
	let infoPartidasSalidas = [];
	let salidas = await Salida.find(filtro)
		.populate({
			path: 'partidas.producto_id',
			model: 'Producto'
		})
		.populate({
			path: 'clienteFiscal_id',
			model: 'ClienteFiscal'
		})
		.populate({
			path: 'almacen_id',
			model: 'Almacen'
		})
		.exec();


	await salidas.forEach(function (salida) {
		let entry = salida;
		salida.partidas.forEach(function (partida) {
			let json = {
				infoPartida: partida,
				infoSalida: entry
			}
			infoPartidasSalidas.push(json);
		});
	});

	return infoPartidasSalidas;
}

async function getNextID(dataContext, field) {
	let max = 0;
	let lastUser = await dataContext.find().sort([[field, -1]]).exec();

	if (lastUser.length > 0)
		max = (lastUser[0])[field];
		
	//console.log(max);

	return max + 1;
}

async function getStringFolio(incr, clienteFiscal_id, Tipo, Ticket) {
	let clienteFiscal = await ClienteFiscal.findOne({ _id: clienteFiscal_id }).exec();
	let stringFolio = "";
	if(Ticket && !Tipo) {
		stringFolio = clienteFiscal.clave + "-TK" + "-" + incr;
	}
	else {
		stringFolio = clienteFiscal.clave + "-" + Tipo + "-" + incr;
	}
	return stringFolio;
}

async function formatPartidasSalida(req, res) {
	Entrada.find({})
		.then((entradas) => {
			entradas.forEach(function (entrada) {
				let partidasSalida = entrada.partidas;

			});
		});
}

async function GetDeliveryGroups(req, res) {

	let _isEntradaOSalida = req.query.isEntradaOSalida;
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let _tipo = req.query.tipoMovimiento;

	let filtro = {
		clienteFiscal_id: { $in: _arrClientesFiscales },
		sucursal_id: { $in: _arrSucursales },
		almacen_id: { $in: _arrAlmacenes },
		tipo: _tipo
	};

	if (_isEntradaOSalida == "Entrada") {
		let PedidosEntrada = await GetDeliveryGroupsEntrada(filtro);
		res.status(200).send(PedidosEntrada);
	} else {
		let PedidosSalida = await GetDeliveryGroupsSalida(filtro);
		res.status(200).send(PedidosSalida);
	}

}

async function GetDeliveryGroupsEntrada(filtro) {

	//Conexion local
	const sql_pool = await new sql.ConnectionPool(configSQL).connect();

	let partidas = await getPartidasEntradas(filtro);

	//console.log(partidas);
	let IDPedidos = await Entrada.find(filtro).distinct("partidas.InfoPedido.IDPedido").exec();
	//console.log(IDPedidos);
	//Se obtienen la informacion de los pedidos de la base de datos en SQL Server
	let queryGetPedidos = `SELECT XD_IDPedido,Delivery,FechaAlta,FechaPGI,FinalNombreComercial,FinalMunicipio,Tarimas,Peso,Volumen,Piezas,Cajas,FechaETA,SucursalCrossDock,StatusProceso FROM View_Pedidos WHERE XD_IDPedido in (${IDPedidos})`;
	//console.log(queryGetPedidos);
	let resultQueryPedidos = [];
	if (IDPedidos.length > 0) {
		resultQueryPedidos = (await sql_pool.query(queryGetPedidos)).recordset;
		//console.log(resultQueryPedidos);
		sql.close();
	}


	let Pedidos = [];
	IDPedidos.forEach(function (IDPedido) {
		let partidasDeIDPedido = partidas.filter(x => x.infoPartida.InfoPedido != undefined ? x.infoPartida.InfoPedido.IDPedido == IDPedido : false);

		if (partidasDeIDPedido.length > 0) {

			let infoPedido = resultQueryPedidos.filter(x => x.XD_IDPedido == IDPedido);

			let jsonPedido = {
				IDPedido: IDPedido,
				Delivery: infoPedido[0].Delivery,
				FechaPGI: infoPedido[0].FechaPGI,
				FechaAlta: infoPedido[0].FechaAlta,
				ClienteDestino: infoPedido[0].FinalNombreComercial,
				CiudadDestino: infoPedido[0].FinalMunicipio,
				T: infoPedido[0].Tarimas != null ? infoPedido[0].Tarimas : 0,
				Kg: infoPedido[0].Peso != null ? infoPedido[0].Peso : 0,
				M3: infoPedido[0].Volumen != null ? infoPedido[0].Volumen : 0,
				Pzs: infoPedido[0].Piezas != null ? infoPedido[0].Piezas : 0,
				Cjs: infoPedido[0].Cajas != null ? infoPedido[0].Cajas : 0,
				FechaETA: infoPedido[0].FechaETA,
				CrossDock: infoPedido[0].SucursalCrossDock,
				StatusProceso: infoPedido[0].StatusProceso,
				Partidas: partidasDeIDPedido.map(m => m.infoPartida),
				FolioEntrada: partidasDeIDPedido.map(m => m.infoEntrada)[0].folio,
				entrada_id: partidasDeIDPedido.map(m => m.infoEntrada)[0]._id,
				idEntrada: partidasDeIDPedido.map(m => m.infoEntrada)[0].idEntrada
			};
			//console.log(jsonPedido);
			Pedidos.push(jsonPedido);
		}
	});

	return Pedidos;

}

async function GetDeliveryGroupsSalida(filtro) {

	//Conexion local
	const sql_pool = await new sql.ConnectionPool(configSQL).connect();

	let partidas = await getPartidasSalidas(filtro);

	//console.log(partidas);
	let IDPedidos = await Salida.find(filtro).distinct("partidas.InfoPedido.IDPedido").exec();
	//console.log(IDPedidos);
	//Se obtienen la informacion de los pedidos de la base de datos en SQL Server
	let queryGetPedidos = `SELECT XD_IDPedido,Delivery,FechaAlta,FechaPGI,FinalNombreComercial,FinalMunicipio,Tarimas,Peso,Volumen,Piezas,Cajas,FechaETA,SucursalCrossDock,StatusProceso FROM View_Pedidos WHERE XD_IDPedido in (${IDPedidos})`;
	//console.log(queryGetPedidos);
	let resultQueryPedidos = [];
	if (IDPedidos.length > 0) {
		resultQueryPedidos = (await sql_pool.query(queryGetPedidos)).recordset;
		//console.log(resultQueryPedidos);
		sql.close();
	}

	let Pedidos = [];
	IDPedidos.forEach(function (IDPedido) {
		let partidasDeIDPedido = partidas.filter(x => x.infoPartida.InfoPedido != undefined ? x.infoPartida.InfoPedido.IDPedido == IDPedido : false);

		if (partidasDeIDPedido.length > 0) {

			let infoPedido = resultQueryPedidos.filter(x => x.XD_IDPedido == IDPedido);

			let jsonPedido = {
				IDPedido: IDPedido,
				Delivery: infoPedido[0].Delivery,
				FechaPGI: infoPedido[0].FechaPGI,
				FechaAlta: infoPedido[0].FechaAlta,
				ClienteDestino: infoPedido[0].FinalNombreComercial,
				CiudadDestino: infoPedido[0].FinalMunicipio,
				T: infoPedido[0].Tarimas != null ? infoPedido[0].Tarimas : 0,
				Kg: infoPedido[0].Peso != null ? infoPedido[0].Peso : 0,
				M3: infoPedido[0].Volumen != null ? infoPedido[0].Volumen : 0,
				Pzs: infoPedido[0].Piezas != null ? infoPedido[0].Piezas : 0,
				Cjs: infoPedido[0].Cajas != null ? infoPedido[0].Cajas : 0,
				FechaETA: infoPedido[0].FechaETA,
				CrossDock: infoPedido[0].SucursalCrossDock,
				StatusProceso: infoPedido[0].StatusProceso,
				Partidas: partidasDeIDPedido.map(m => m.infoPartida),
				FolioSalida: partidasDeIDPedido.map(m => m.infoSalida)[0].folio,
				salida_id: partidasDeIDPedido.map(m => m.infoSalida)[0]._id,
				idSalida: partidasDeIDPedido.map(m => m.infoSalida)[0].idSalida
			};
			//console.log(jsonPedido);
			Pedidos.push(jsonPedido);
		}
	});


	return Pedidos;

}

async function getSucursalesXD(req, res) {
	try {
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();

		let IDSucursales = await Interfaz_ALM_XD.find({ tipo: "Sucursal" }).distinct("xd_id").exec();


		let queryGetSucursales = `SELECT * FROM Sucursales WHERE IDSucursal not in (${IDSucursales}) and StatusReg = 'ACTIVO'`;
		let resultQuerySucursales = (await sql_pool.query(queryGetSucursales)).recordset;

		sql.close();

		res.status(200).send(resultQuerySucursales);
	}
	catch (error) {
		res.status(500).send(error);
	}
}

async function getClientesFiscalesXD(req, res) {
	try {
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();
		let IDClientesFiscales = await Interfaz_ALM_XD.find({ tipo: "Cliente" }).distinct("xd_id").exec();

		let queryGetClientes = `SELECT * FROM Clientes WHERE isFiscal = 1 and IDCliente not in (${IDClientesFiscales}) and StatusProceso = 'VALIDADO'`;
		let resultQueryClientes = (await sql_pool.query(queryGetClientes)).recordset;

		sql.close();

		res.status(200).send(resultQueryClientes);
	}
	catch (error) {
		res.status(500).send(error);
	}
}

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

function Clone(jsonOBJ) {
	return JSON.parse(JSON.stringify(jsonOBJ));
}

function emptyEmbalajes(jsonEmbalaje) {
	let embalajeAuxiliar = Clone(jsonEmbalaje);
	for (let embalaje in embalajeAuxiliar) {
		embalajeAuxiliar[embalaje] = 0;
	}
	return embalajeAuxiliar;
}

async function emptyAllEmbalajes() {
	try {
		let embalajes = {};
		let allEmbalajes = await Embalaje.find({}).exec();
		allEmbalajes.forEach(function (embalaje) {
			embalajes[embalaje.clave] = 0;
		});
	}
	catch (error) {
		return undefined;
	}
}

function isEmptyEmbalaje(embalaje) {
	let contEmbalajesCero = 0;
	let tamEmbalajes = 0;

	for (let x in embalaje) { tamEmbalajes += 1; } //Se obtiene la cantidad de embalajes
	for (let x in embalaje) {  //Obtiene la cantidad de embalajes con cero
		if (embalaje[x] == 0) contEmbalajesCero += 1;
	}

	// Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
	if (tamEmbalajes == contEmbalajesCero)
		return true;
	else
		return false;
}

function Compare(obj1, obj2) { //Compare json for 1 level of fields

	//Check same fields for Obj1 to Obj2
	for (let field in obj1) {
		let result = obj2.hasOwnProperty(field);
		if (!result) return false;
	}

	//Check same fields for Obj2 to Obj1
	for (let field in obj2) {
		let result = obj1.hasOwnProperty(field);
		if (!result) return false;
	}

	for (let field in obj1) {
		if (obj1[field] != obj2[field]) return false;
	}

	return true;
}

function getLevelNameFromNumber(nivel = 1){

	const LETTER_INIT = 64;

	const nivelNumber = parseInt(nivel) + LETTER_INIT;

	const nivelName = String.fromCharCode(nivelNumber);

	return nivelName;

}

function getLevelNumberFromName(nivel = "A"){

	const LETTER_INIT = 64;

	const nivelName = nivel.charCodeAt() - LETTER_INIT;

	return nivelName;

}

function getDaysForExpire(partida, producto, hoy){

	
	let Diasrestantes = Math.round((partida.fechaCaducidad.getTime() - (producto.garantiaFrescura * 86400000) -hoy)/ 86400000);

	return Diasrestantes;
}

function allElementAreEqualsInArray(elementsArray = []){

	const sumArray = elementsArray.reduce((val, acc) => val += acc);

	if((sumArray / elementsArray[0]) === elementsArray.length){
		return true;
	};

	return false;
}

function sortPartidasByLevel(a, b){
	return getLevelNumberFromName(b.posiciones[0].nivel) - getLevelNumberFromName(a.posiciones[0].nivel);
}

function sortPartidasByEmbalajesxSalir(a, b){
	return a.embalajesxSalir.cajas - b.embalajesxSalir.cajas;
}


function sortPartidasByAlternatePosition(partidas = []){

	const ordenPosiciones = partidas.sort((a, b) =>{

		let nivelNumberA = getLevelNumberFromName(a.posiciones[0].nivel);
		let nivelNumberB = getLevelNumberFromName(b.posiciones[0].nivel);

		return (parseInt(a.posiciones[0].posicion) + parseInt(nivelNumberA)) - (parseInt(b.posiciones[0].posicion) + parseInt(nivelNumberB));

	});

	const posicionesFrente = ordenPosiciones.filter(partida => {
		return !partida.posiciones[0].pasillo.includes(".")
	}).sort((a, b) => a.posiciones[0].pasillo.charCodeAt() - b.posiciones[0].pasillo.charCodeAt());
		
	const posicionesFondo = ordenPosiciones.filter(partida => {
		return partida.posiciones[0].pasillo.includes(".")
	}).sort((a, b) => a.posiciones[0].pasillo.charCodeAt() - b.posiciones[0].pasillo.charCodeAt());
	
	const posicionesOrdenadas = posicionesFrente.concat(posicionesFondo);
	let posicionesAcomodadas = [];


	let index = 0;

	while(posicionesAcomodadas.length !== partidas.length){
		
		posicionesAcomodadas.push(posicionesOrdenadas[index])
		let slicePos = posicionesOrdenadas[index].posiciones[0].pasillo;
		posicionesOrdenadas.shift();
		let indexPos = findPosition(slicePos+".", posicionesOrdenadas);
		
		if(indexPos !== -1){
			posicionesAcomodadas.push(posicionesOrdenadas[indexPos]);
			posicionesOrdenadas.splice(indexPos, 1);
		}
		
	}  

	const posicionesTrasbordo = posicionesAcomodadas.slice(findPosition("TRASBORDO", posicionesAcomodadas));
	posicionesAcomodadas.splice(findPosition("TRASBORDO", posicionesAcomodadas));
	const posicionesAlternadasPrioridadTrasbordo = posicionesTrasbordo.concat(posicionesAcomodadas);

	return posicionesAlternadasPrioridadTrasbordo;

}

function findPosition(pasillo,  partidas ){
    return partidas.findIndex(partida => partida.posiciones[0].pasillo === pasillo);
}

function deletePartidasWithNegativeExpireDays(partidas, producto, hoy){

	return partidas.filter(partida => getDaysForExpire(partida, producto, hoy) >= 0);
	
}

function createPedidoJSONForHold(pedidoJson = {}){
	
const pedidoDetalle = pedidoJson.Pedido;
const informacionPedido = {
    "almacen_id": pedidoJson.IdAlmacen,
    "clienteFiscal_id": pedidoJson.IDClienteFiscal,
    "sucursal_id": pedidoJson.IDSucursal,
	"referencia": pedidoDetalle[1].Pedido
}
const productosArray = [];

for(let i = 14; i < pedidoDetalle.length; i++){

    if(Object.keys(pedidoDetalle[i]).includes("Clave")){
        
        const pedidoObject = {
            "No": pedidoDetalle[i].NO,
            "producto": pedidoDetalle[i].producto,
            "Clave": pedidoDetalle[i].Clave,
            "Cantidad": pedidoDetalle[i].Cantidad
        }
        
        productosArray.push(pedidoObject)
    }

    informacionPedido.productosDetalle = productosArray;


}
    return informacionPedido;


}

function isPicking(equivalencia, cantidadPedida, isEstiba = false){

	if(isEstiba === true){
		return (cantidadPedida === equivalencia || cantidadPedida === equivalencia * 2 || cantidadPedida === (equivalencia / 2))
	}else{
		return (cantidadPedida === equivalencia || cantidadPedida === equivalencia * 2)
	}



}


module.exports = {
	getNextID,
	getPartidasByIDs,
	GetDeliveryGroups,
	getStringFolio,
	getSucursalesXD,
	getClientesFiscalesXD,
	asyncForEach,
	distinct,
	Clone,
	emptyEmbalajes,
	isEmptyEmbalaje,
	emptyAllEmbalajes,
	Compare,
	getLevelNameFromNumber,
	getLevelNumberFromName,
	getDaysForExpire,
	allElementAreEqualsInArray,
	sortPartidasByLevel,
	sortPartidasByEmbalajesxSalir,
	sortPartidasByAlternatePosition,
	deletePartidasWithNegativeExpireDays,
	createPedidoJSONForHold,
	isPicking
}