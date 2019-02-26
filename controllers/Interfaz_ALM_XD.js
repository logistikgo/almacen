'use strict'

const Interfaz_ALM_XD = require('../models/Interfaz_ALM_XD');

async function getIDClienteALM(arrClientesXD) {
	console.log(arrClientesXD);
	let clientesALM_XD = await Interfaz_ALM_XD.find({xd_id:{$in:arrClientesXD},tipo:"Cliente"}).exec();
	let arrClientesALM = clientesALM_XD.map(x=>x.alm_id.toString());
	return arrClientesALM;
}

async function getIDSucursalALM(arrSucursalesXD) {
	console.log(arrSucursalesXD);
	let SucursalesALM_XD = await Interfaz_ALM_XD.find({xd_id:{$in:arrSucursalesXD},tipo:"Sucursal"}).exec();
	let arrSucursalesALM = SucursalesALM_XD.map(x=>x.alm_id.toString());
	return Sucu
}




module.exports = {
	getIDClienteALM,
	getIDSucursalALM
}