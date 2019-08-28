//const PDF = require('pdfkit');
const Entrada = require('./models/Entrada');
const Partida = require('./models/Partida');
const Salida = require('./models/Salida');
const MovimientoInventario = require('./models/MovimientoInventario');
const Interfaz_ALM_XD = require('./models/Interfaz_ALM_XD');
const ClienteFiscal = require('./models/ClienteFiscal');
const fs = require('fs');
const moment = require('moment');
const blobstream = require('blob-stream');

const configSQL = (require('./configSQL'));
const sql = require('mssql');

const distinct = (value,index,self) =>{
    return self.indexOf(value) === index;
};


//sql.close();
//Se conecta a la base de datos en SQL conexion global

async function getPartidasByIDs(req,res){
	
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let _tipo = req.query.tipoMovimiento;
	let fechaI = req.query.fechaInicio;
	let fechaF = req.query.fechaFinal;
	let tipo = req.query.tipo;

	
	if(fechaI==null){
		let infoPartidasGrl = await getPartidas(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,_tipo);
		await res.status(200).send(infoPartidasGrl);
	}else{
		let infoPartidasFiltro = await getPartidasFiltro(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,fechaI,fechaF,tipo,_tipo);
		await res.status(200).send(infoPartidasFiltro);
	}

}

async function getPartidasFiltro(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,fechaI,fechaF,tipo,_tipo){
	let infoPartidasFiltro = [];
	let boolFechas = fechaI==fechaF;
	
	let rango = {
		$gte:new Date(fechaI),
		$lt:new Date(fechaF)
	};

	let filtroEntrada = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};
	let filtroSalida = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};
	if(!boolFechas){
		filtroEntrada["fechaEntrada"] = rango;
		filtroSalida["fechaSalida"] = rango;
	}
	
	if(tipo=="ENTRADA"){
		let partidasEntrada = await getPartidasEntradas(filtroEntrada);
		infoPartidasFiltro = partidasEntrada;
	}else if(tipo == "SALIDA"){
		let partidasSalida = await getPartidasSalidas(filtroSalida);
		infoPartidasFiltro = partidasSalida;
	}else{
		let partidasEntrada = await getPartidasEntradas(filtroEntrada);
		let partidasSalida = await getPartidasSalidas(filtroSalida);
		infoPartidasFiltro = partidasEntrada.concat(partidasSalida);
	}
	
		
	return infoPartidasFiltro;
}

async function getPartidas(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,_tipo){
	let infoPartidasGrl = [];

	let filtro = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};

	let partidasEntrada = await getPartidasEntradas(filtro);
	//console.log(filtro);
	
	//let partidasSalida = await getPartidasSalidas(filtro);

	//infoPartidasGrl = partidasEntrada.concat(partidasSalida);
	//return infoPartidasGrl;
	return partidasEntrada;
}

async function getPartidasEntradas(filtro){

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
async function getPartidasSalidas(filtro){
	let infoPartidasSalidas = [];
	let salidas = await Salida.find(filtro)
		.populate({
			path:'partidas.producto_id',
			model:'Producto'
		})
		.populate({
			path:'clienteFiscal_id',
			model:'ClienteFiscal'
		})
		.populate({
			path:'almacen_id',
			model:'Almacen'
		})
		.exec();
		
		
		await salidas.forEach(function(salida){
			let entry = salida;
			salida.partidas.forEach(function(partida){
				let json = {
					infoPartida:partida,
					infoSalida:entry
				}
				infoPartidasSalidas.push(json);
			});
		});
		
		return infoPartidasSalidas;
}

async function getNextID(dataContext, field){
	let max = 0;
	let lastUser = await dataContext.find().sort([[field,-1]]).exec();
	
	if(lastUser.length > 0)
		max = (lastUser[0])[field];

	//console.log(max);

	return max + 1;
}

async function getStringFolio(incr,clienteFiscal_id,Tipo){
	let clienteFiscal = await ClienteFiscal.findOne({_id:clienteFiscal_id}).exec();
	//console.log(clienteFiscal);
	let stringFolio = clienteFiscal.clave + "-" + Tipo + "-" + incr;
	return stringFolio;
}

async function formatPartidasSalida(req,res){
	Entrada.find({})
	.then((entradas)=>{
		entradas.forEach(function(entrada){
			let partidasSalida = entrada.partidas;

		});
	});
}

async function GetDeliveryGroups(req,res){

	let _isEntradaOSalida = req.query.isEntradaOSalida;
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let _tipo = req.query.tipoMovimiento;

	let filtro = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		sucursal_id:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes},
		tipo:_tipo
	};

	if(_isEntradaOSalida == "Entrada"){
		let PedidosEntrada = await GetDeliveryGroupsEntrada(filtro);
		res.status(200).send(PedidosEntrada);
	}else{
		let PedidosSalida = await GetDeliveryGroupsSalida(filtro);
		res.status(200).send(PedidosSalida);
	}

}

async function GetDeliveryGroupsEntrada(filtro){

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
	if(IDPedidos.length>0){
		resultQueryPedidos = (await sql_pool.query(queryGetPedidos)).recordset;
		//console.log(resultQueryPedidos);
		sql.close();	
	}
	

	let Pedidos = [];
	IDPedidos.forEach(function(IDPedido){
		let partidasDeIDPedido = partidas.filter(x =>  x.infoPartida.InfoPedido!=undefined ? x.infoPartida.InfoPedido.IDPedido == IDPedido : false);
		
		if(partidasDeIDPedido.length>0){

			let infoPedido = resultQueryPedidos.filter(x=> x.XD_IDPedido == IDPedido);

			let jsonPedido = {
				IDPedido: IDPedido,
				Delivery:  infoPedido[0].Delivery,
				FechaPGI:  infoPedido[0].FechaPGI,
				FechaAlta: infoPedido[0].FechaAlta,
				ClienteDestino: infoPedido[0].FinalNombreComercial,
				CiudadDestino: infoPedido[0].FinalMunicipio,
				T:infoPedido[0].Tarimas !=null ? infoPedido[0].Tarimas : 0,
				Kg:infoPedido[0].Peso !=null ? infoPedido[0].Peso : 0,
				M3:infoPedido[0].Volumen !=null ? infoPedido[0].Volumen : 0,
				Pzs:infoPedido[0].Piezas !=null ? infoPedido[0].Piezas : 0,
				Cjs:infoPedido[0].Cajas !=null ? infoPedido[0].Cajas : 0,
				FechaETA:infoPedido[0].FechaETA,
				CrossDock:infoPedido[0].SucursalCrossDock,
				StatusProceso:infoPedido[0].StatusProceso,
				Partidas: partidasDeIDPedido.map(m=> m.infoPartida),
				FolioEntrada: partidasDeIDPedido.map(m=> m.infoEntrada)[0].folio,
				entrada_id: partidasDeIDPedido.map(m=> m.infoEntrada)[0]._id,
				idEntrada: partidasDeIDPedido.map(m=> m.infoEntrada)[0].idEntrada
			};
			//console.log(jsonPedido);
			Pedidos.push(jsonPedido);
		}
	});

	return Pedidos;

}

async function GetDeliveryGroupsSalida(filtro){

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
	if(IDPedidos.length>0){
		resultQueryPedidos = (await sql_pool.query(queryGetPedidos)).recordset;
		//console.log(resultQueryPedidos);
		sql.close();	
	}

	let Pedidos = [];
	IDPedidos.forEach(function(IDPedido){
		let partidasDeIDPedido = partidas.filter(x =>  x.infoPartida.InfoPedido!=undefined ? x.infoPartida.InfoPedido.IDPedido == IDPedido : false);
		
		if(partidasDeIDPedido.length>0){

			let infoPedido = resultQueryPedidos.filter(x=> x.XD_IDPedido == IDPedido);

			let jsonPedido = {
				IDPedido: IDPedido,
				Delivery:  infoPedido[0].Delivery,
				FechaPGI:  infoPedido[0].FechaPGI,
				FechaAlta: infoPedido[0].FechaAlta,
				ClienteDestino: infoPedido[0].FinalNombreComercial,
				CiudadDestino: infoPedido[0].FinalMunicipio,
				T:infoPedido[0].Tarimas !=null ? infoPedido[0].Tarimas : 0,
				Kg:infoPedido[0].Peso !=null ? infoPedido[0].Peso : 0,
				M3:infoPedido[0].Volumen !=null ? infoPedido[0].Volumen : 0,
				Pzs:infoPedido[0].Piezas !=null ? infoPedido[0].Piezas : 0,
				Cjs:infoPedido[0].Cajas !=null ? infoPedido[0].Cajas : 0,
				FechaETA:infoPedido[0].FechaETA,
				CrossDock:infoPedido[0].SucursalCrossDock,
				StatusProceso:infoPedido[0].StatusProceso,
				Partidas: partidasDeIDPedido.map(m=> m.infoPartida),
				FolioSalida: partidasDeIDPedido.map(m=> m.infoSalida)[0].folio,
				salida_id: partidasDeIDPedido.map(m=> m.infoSalida)[0]._id,
				idSalida: partidasDeIDPedido.map(m=> m.infoSalida)[0].idSalida
			};
			//console.log(jsonPedido);
			Pedidos.push(jsonPedido);
		}
	});

	
	return Pedidos;

}

async function getSucursalesXD(req,res){
	try
	{
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();

		let IDSucursales = await Interfaz_ALM_XD.find({tipo:"Sucursal"}).distinct("xd_id").exec();
		

		let queryGetSucursales = `SELECT * FROM Sucursales WHERE IDSucursal not in (${IDSucursales}) and StatusReg = 'ACTIVO'`;
		let resultQuerySucursales = (await sql_pool.query(queryGetSucursales)).recordset;
		
		sql.close();
		
		res.status(200).send(resultQuerySucursales);
	}
	catch(error){
		res.status(500).send(error);
	}
}

async function getClientesFiscalesXD(req,res){
	try
	{
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();
		let IDClientesFiscales = await Interfaz_ALM_XD.find({tipo: "Cliente"}).distinct("xd_id").exec();
		
		let queryGetClientes = `SELECT * FROM Clientes WHERE isFiscal = 1 and IDCliente not in (${IDClientesFiscales}) and StatusProceso = 'VALIDADO'`;
		let resultQueryClientes = (await sql_pool.query(queryGetClientes)).recordset;
		
		sql.close();
		
		res.status(200).send(resultQueryClientes);
	}
	catch(error)
	{
		res.status(500).send(error);
	}
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

function Clone(jsonOBJ){
	return JSON.parse(JSON.stringify(jsonOBJ));
}

function emptyEmbalajes(jsonEmbalaje){
	let embalajeAuxiliar = Clone(jsonEmbalaje);
	for(let embalaje in embalajeAuxiliar){
		embalajeAuxiliar[embalaje] = 0;
	}
	return embalajeAuxiliar;
}

function isEmptyEmbalaje(embalaje){
	let contEmbalajesCero = 0;
	let tamEmbalajes = 0;

	for(let x in embalaje){tamEmbalajes+=1;} //Se obtiene la cantidad de embalajes
	for(let x in embalaje){  //Obtiene la cantidad de embalajes con cero
		if(embalaje[x]==0) contEmbalajesCero+=1; 
	}

	// Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
	if(tamEmbalajes == contEmbalajesCero) 
		return true;
	else
		return false;
}


//MIGRACION 
async function migracion1(req,res){
	let entradas = await Entrada.find({partidasSalida: {$ne:null}}).exec();
	console.log(entradas.length);
	let updateadosFalse = [];
	let updateadosTrue = [];
	// console.log(entradas.length,"BEGIN");

	await asyncForEach(entradas,async function(entrada){
		let totalPartidasSalida = entrada.partidasSalida.length;
		let totalPartidasVacias = 0;
		entrada.partidasSalida.forEach(partidaSalida=>{
			let isEmpty = isEmptyEmbalaje(partidaSalida.embalajes);
			if(isEmpty){
				totalPartidasVacias+=1;
			}
		});
		console.log("totalPartidasVacias == totalPartidasSalida",totalPartidasVacias == totalPartidasSalida);
		if(totalPartidasVacias == totalPartidasSalida){
			if(entrada.isEmpty == undefined || entrada.isEmpty == false){

				await Entrada.findOneAndUpdate({_id : entrada._id},{$set : {isEmpty: true}},{new:true}).exec();
				updateadosTrue.push(entrada._id);
			}
			//let entradaup = await Entrada.findOneAndUpdate({_id : entrada._id},{$set : {isEmpty: true}},{new:true}).exec();
			//let entradaup = await Entrada.findOne({_id : entrada._id}).exec();
			
		}else{
			if(entrada.isEmpty == undefined || entrada.isEmpty == true){
				//updateados.push(entrada._id);
				await Entrada.findOneAndUpdate({_id : entrada._id},{$set : {isEmpty: false}},{new:true}).exec();
				updateadosFalse.push(entrada._id);
			}
			
			//
		}
	});
	 res.status(200).send({updateTrue : updateadosTrue, updateFalse : updateadosFalse});
}

async function migracion2(req,res){
	let entradas = await Entrada.find({isEmpty:false, cantSalidas:1,cantPartidas:1}).exec();
	let partidasupdateadas = [];
	asyncForEach(entradas,async function(entrada){
		if(entrada.partidas.length > 0 && entrada.partidas[0].embalajes){
			
			let embalajesxSalir = Clone(entrada.partidas[0].embalajes);
			let salidas_id = [];
			let embalajesSalida = emptyEmbalajes(entrada.partidas[0].embalajes);
			let salidas = await Salida.find({entrada_id : entrada._id}).exec();
			//console.log(salidas.length);
			salidas.forEach(function(salida){
				let jsonSalida = {};
				jsonSalida["salida_id"] = salida._id;
				jsonSalida["salidaxPosiciones"] = [];
				salida.partidas.forEach(function(partida){
					for(let x in embalajesxSalir){
						if(partida.embalajes[x]!= undefined){
							embalajesxSalir[x] -= partida.embalajes[x];
							embalajesSalida[x] += partida.embalajes[x];
						}
					}
					let posic = {
						embalajes : partida.embalajes,
						pasillo : partida.pasillo,
						pasillo_id : partida.pasillo_id,
						posicion : partida.posicion,
						posicion_id : partida.posicion_id,
						nivel : partida.nivel,

					};
					jsonSalida.salidaxPosiciones.push(posic);
				});
				jsonSalida["embalajes"] = embalajesSalida;
				salidas_id.push(jsonSalida);
			});
			let partidaF = await Partida.findOne({_id: entrada.partidasI[0]});
			let posiciones = partidaF.posiciones;
			posiciones[0].isEmpty = true;
			posiciones[0].embalajesxSalir = embalajesxSalir;
			await Partida.updateOne({_id: entrada.partidasI[0]},{$set : {
				embalajesxSalir : embalajesxSalir,
				salidas_id : salidas_id,
				posiciones : posiciones

			}}).exec();
			await Entrada.updateOne({_id : entrada._id},{$set : {isEmpty:true} });
			partidasupdateadas.push(entrada.partidasI[0]);
		}
	});
	res.status(200).send(partidasupdateadas);
}

async function migracion3(req,res){
	let entrada = await Entrada.findOne({_id : "5d13a00c62251225187c0096"}).exec();
	let salidas = await Salida.find({entrada_id : entrada._id}).exec();
	asyncForEach(entrada.partidasSalida,partidaSalida=>{
		
		salidas.forEach(salida=>{
			let jsonsalida_id = {};
			jsonSalida_id['salida_id'] = salida._id;
			jsonsalida_id['salidaxPosiciones'] = [];
			salida.partidas.forEach(partidaEnSalida=>{
				if(partidaDeSalida._id.toString() == partidaSalida._id.toString()){
					jsonsalida_id['embalajes'] = partidaEnSalida.embalajes;
					let posic = {
						embalajes : partida.embalajes,
						pasillo : partida.pasillo,
						pasillo_id : partida.pasillo_id,
						posicion : partida.posicion,
						posicion_id : partida.posicion_id,
						nivel : partida.nivel,

					};
					jsonSalida.salidaxPosiciones.push(posic);
				}
			});
		});

	});
	


	res.status(200).send({entradas: entradas});
}

async function migracion4(req,res){

	let entrada = await Entrada.findOne({_id : req.body._id}).exec();
	let salidas = await Salida.find({entrada_id : entrada._id}).exec();
	let partidasM = await Partida.find({entrada_id : entrada._id}).exec();
	
	let partidasOk = [];
	// entrada.partidasSalida.forEach(partidaSalida=>{
	// 	let partidaF = Clone(partidasM.find(x=> x.lote == partidaSalida.lote));
	// 	partidasOk.push(partidaF);
	// });
	let partidasupdateadas = [];
	entrada.partidasSalida.forEach(partidaSalida=>{

		let partidasEnSalida = [];
		let partidaF = Clone(partidasM.find(x=> x.lote == partidaSalida.lote));
		partidaF.embalajesxSalir = partidaSalida.embalajes;
		partidaF.posiciones[0].embalajesxSalir = partidaSalida.embalajes;
		let embalajesxSalir = partidaSalida.embalajes;
		let salidas_id = [];

		salidas.forEach(salida=>{


			let jsonSalida_id = {};
			jsonSalida_id['salida_id'] = salida._id;
			jsonSalida_id['salidaxPosiciones'] = [];
			salida.partidas.forEach(partidaEnSalida=>{
				let partidaEnSalidaCloned = Clone(partidaEnSalida);
				partidaEnSalidaCloned.salida_id = salida._id;
				if(partidaSalida._id.toString() == partidaEnSalida._id.toString()){
					partidasEnSalida.push(partidaEnSalidaCloned);
				}
			});
		});

		let filterSalidas = partidasEnSalida.map(x=> x.salida_id).filter(distinct);
		
		filterSalidas.forEach(salida_id=>{
			let partidasxSalida = partidasEnSalida.filter(x=> x.salida_id.toString() == salida_id);
			let embalajesSalida = emptyEmbalajes(partidaSalida.embalajes);
			let salidaxPosiciones = {
				posicion_id : partidasxSalida[0].posicion_id,
				posicion : partidasxSalida[0].posicion,
				pasillo_id : partidasxSalida[0].pasillo_id,
				pasillo : partidasxSalida[0].pasillo,
				nivel : partidasxSalida[0].nivel,
				nivel_id : partidasxSalida[0].nivel_id
			};
			partidasxSalida.forEach(partidaxSalida=>{
				for(let x in embalajesSalida){
					embalajesSalida[x] += parseFloat(partidaxSalida.embalajes[x]);
				}
			});
			salidaxPosiciones['embalajes'] = embalajesSalida;
			let jsonSalida_id = {
				salida_id : salida_id,
				embalajes : embalajesSalida,
				salidaxPosiciones : salidaxPosiciones
			};
			salidas_id.push(jsonSalida_id);
		});
		partidaF.salidas_id = salidas_id;
		let isEmpty = isEmptyEmbalaje(partidaF.embalajesxSalir);
		partidaF.isEmpty = isEmpty;
		partidaF.posiciones[0].isEmpty = isEmpty;


		partidasupdateadas.push(partidaF);
	});

	
	if(req.body.update){
		await asyncForEach(partidasupdateadas,async function(partida){
		
			await Partida.updateOne({_id : partida._id},{$set : {
				embalajesxSalir : partida.embalajesxSalir,
				posiciones : partida.posiciones,
				salidas_id : partida.salidas_id,
				isEmpty : partida.isEmpty
			}});
		});
	}

	//res.status(200).send({partidasDelModelo: partidasupdateadas, partidasEnSalida: partidasEnSalida});
	res.status(200).send(partidasupdateadas);
	//res.status(200).send(partidasOk);
}

async function migracion(req,res){
	let partidas = await Partida.find({});

	await asyncForEach(partidas,async function(partida){
		if(partida.salidas_id != undefined && partida.salidas_id.length > 0){
			await asyncForEach(partida.salidas_id,async function(salida_id){
				let salida = Clone(await Salida.findOne({_id : salida_id.salida_id}).exec());
				//console.log(salida.partidas);
				salida.partidas.push(partida._id);
				//console.log(salida._id,partida._id);
				await Salida.updateOne({_id : salida._id},{$set : {partidas: salida.partidas}});
			});
		}
	});
	//let partidasOk = partidas.map(x=> x.)
	console.log("oks");
	res.status(200).send("OKs");
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
	migracion
}