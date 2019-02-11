'use strict'

const ClienteALM_XD = require('../models/ClienteALM_XD');

async function getIDClienteALM(arrClientesXD) {
	let clientesALM_XD = await ClienteALM_XD.find({xd_id:{$in:arrClientesXD}}).exec();
	let arrClientesALM = clientesALM_XD.map(x=>x.alm_id.toString());
	return arrClientesALM;
}

module.exports = {
	getIDClienteALM
}