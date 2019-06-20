const configSQL = (require('../configSQLDebug'));
const sql = require('mssql');
const Helpers = require('../helpers');

//GETS
async function getEntradas(req,res){
	try
	{
		//console.log("GET ENTRADAS YORK")
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();		

		let queryGet = `SELECT * FROM ALM_Entradas`;
		let result = (await sql_pool.query(queryGet)).recordset;
		
		sql.close();
		
		res.status(200).send(result);
	}
	catch(error){
		res.status(500).send(error);
	}
}

async function getSalidas(req,res){
	try
	{
		//console.log("GET SALIDAS YORK")
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();		

		let queryGet = `SELECT * FROM ALM_Salidas`;
		let result = (await sql_pool.query(queryGet)).recordset;
		
		sql.close();
		
		res.status(200).send(result);
	}
	catch(error){
		res.status(500).send(error);
	}
}

async function getProductos(req,res){
	try
	{
		//console.log("GET PRODUCTOS YORK")
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();		

		let queryGet = `SELECT * FROM Productos`;
		let result = (await sql_pool.query(queryGet)).recordset;
		
		sql.close();
		
		res.status(200).send(result);
	}
	catch(error){
		res.status(500).send(error);
	}
}

async function getPartidasEntrada(req,res){
	try
	{
		//console.log("GET PARTIDAS X ENTRADA YORK")
		let idEntrada = req.query.IDEntrada;

		const sql_pool = await new sql.ConnectionPool(configSQL).connect();		

		let queryGet = `SELECT * FROM ALM_PartidasEntradas where IDALM_Entrada = ${idEntrada}`;
		let result = (await sql_pool.query(queryGet)).recordset;
		
		sql.close();
		
		res.status(200).send(result);
	}
	catch(error){
		res.status(500).send(error);
	}
}

async function getPartidasSalida(req,res){
	try
	{
		//console.log("GET PARTIDAS X SALIDA YORK")
		let idSalida = req.query.IDSalida;

		const sql_pool = await new sql.ConnectionPool(configSQL).connect();		

		let queryGet = `SELECT * FROM ALM_PartidasSalida where IDALM_Salida = ${idSalida}`;
		let result = (await sql_pool.query(queryGet)).recordset;
		
		sql.close();
		
		res.status(200).send(result);
	}
	catch(error){
		res.status(500).send(error);
	}
}

//SAVES

async function saveEntrada(req,res){
	try
	{	
		const sql_pool = await new sql.ConnectionPool(configSQL).connect();		
		let queryGetLastFolio = 'SELECT TOP 1 Folio FROM ALM_Entradas WHERE Folio IS NOT NULL ORDER BY FechaAlta DESC';
		let lastFolio = (await sql_pool.query(queryGetLastFolio)).recordset[0].Folio;
		let nextFolio = parseInt(lastFolio) + 1;
		console.log(nextFolio);
		let IDUsuario = req.body.IDUsuario;
		let FechaIngreso = req.body.FechaIngreso;
		let Peso = req.body.Peso;
		let Pedimento = req.body.Pedimento;
		let OrdenCompra = req.body.OrdenCompra;
		let Transportista = req.body.Transportista;
		let Partidas = req.body.Partidas;
		let querySaveEntrada = `
		INSERT INTO ALM_Entradas 
		(IDUsuarioAlta,FechaIngreso,FechaAlta,Folio,Consecutivo,Peso,Pedimento,OrdenCompra,Transportista,StatusReg)
		VALUES ('${IDUsuario}','${(new Date(FechaIngreso)).toISOString()}','${(new Date()).toISOString()}','${nextFolio}',${nextFolio},${Peso},'${Pedimento}','${OrdenCompra}','${Transportista}','TEST')`;
		//console.log(querySaveEntrada);
		let entradaSaved = (await sql_pool.query(querySaveEntrada)).rowsAffected;
		//console.log(entradaSaved);
		if((entradaSaved.length > 0) && (entradaSaved[0] > 0)){
			let queryEntradaCreada = `SELECT IDALM_Entrada FROM ALM_Entradas WHERE Folio = '${nextFolio}'`;
			let entrada = (await sql_pool.query(queryEntradaCreada)).recordset[0];
			
			Partidas.forEach(async function(partida){
				let querySavePartida = `
				INSERT INTO ALM_PartidasEntradas 
				(IDProducto,IDUsuarioAlta,IDALM_Entrada,FechaAlta,Contenedor,NumeroParte,Tarimas,Piezas,Peso,Pedimento,Observaciones,IsSalida) 
				VALUES (${partida.IDProducto},${IDUsuario},${entrada.IDALM_Entrada},'${(new Date()).toISOString()}','${partida.Contenedor}','${partida.NumeroParte}',${partida.Tarimas},${partida.Piezas},${partida.Peso},'${partida.Pedimento}','${partida.Observaciones}',${partida.IsSalida})`;
				let partidaSaved = (await sql_pool.query(querySavePartida)).rowsAffected;
				if(partidaSaved.length > 0 && partidaSaved[0] > 0){
					await updateExistencias(partida.IDProducto,partida.Piezas,sql_pool);
				}
			});
		}
		
		sql.close();
		
		res.status(200).send(entradaSaved);
	}
	catch(error){
		res.status(500).send(error);
	}
}

//UPDATES
async function updateExistencias(IDProducto,Piezas,sql_pool){
	let queryUpdate = `UPDATE Productos SET Existencias = Existencias + ${Piezas} where IDProducto = ${IDProducto}`;
	let producto = (await sql_pool.query(queryUpdate)).rowsAffected;
	console.log(producto);
}

//Collapse all in visual studio code Ctr + K + 1
//DELETES

module.exports={
	getEntradas,
	getSalidas,
	getProductos,
	getPartidasEntrada,
	getPartidasSalida,
	saveEntrada
}
