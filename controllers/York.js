const configSQL = (require('../configSQLDebug'));
const sql = require('mssql');

//GETS
async function getEntradas(req,res){
	try
	{
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
		let idSalida = req.query.IDSalida;

		const sql_pool = await new sql.ConnectionPool(configSQL).connect();		

		let queryGet = `SELECT * FROM ALM_PartidasSalida where IDALM_Salida = ${idEntrada}`;
		let result = (await sql_pool.query(queryGet)).recordset;
		
		sql.close();
		
		res.status(200).send(result);
	}
	catch(error){
		res.status(500).send(error);
	}
}

//SAVES

//UPDATES

//DELETES

module.exports={
	getEntradas,
	getSalidas,
	getProductos,
	getPartidasEntrada,
	getPartidasSalida
}
