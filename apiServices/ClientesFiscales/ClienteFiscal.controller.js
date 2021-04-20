'use strict'
const ClienteFiscal = require('./ClienteFiscal.model');
const Embalaje = require('../Embalaje/Embalaje.model');
const Helper = require('../../services/utils/helpers');
const Interfaz_ALM_XD = require('../Interfaz_ALM_XD/Interfaz_ALM_XD.model');

async function getNextID() {
	return await Helper.getNextID(ClienteFiscal, "idCliente");
}

function get(req, res) {
	let sucursal_id = req.query.id

	let jFilter = {
		statusReg: "ACTIVO"
	};
	
	ClienteFiscal.find(jFilter).sort({ nombreCorto: 1 })
		.then((cliente) => {
			res.status(200).send(cliente);
		})
		.catch((err) => {
			return res.status(500).send(err);
		});
}

function getByIDClienteFiscal(req, res) {
	let _id = req.query.id;

	ClienteFiscal.findOne({ _id: _id })
		.then((clienteFiscal) => {
			res.status(200).send(clienteFiscal);

		}).catch((error) => {
			res.status(500).send(error);
		});
}

async function save(req, res) {
	let nCliente = new ClienteFiscal(req.body);

	let IDClienteXD = req.body.IDClienteXD;

	nCliente.idCliente = await getNextID();
	nCliente.fechaAlta = new Date();
	nCliente.statusReg = "ACTIVO";

	nCliente.save()
		.then((cliente) => {

			if (IDClienteXD != "Ninguna") {
				let NombreClienteXD = req.body.NombreClienteXD;
				let nInterfaz = new Interfaz_ALM_XD();
				nInterfaz.nombre = NombreClienteXD;
				nInterfaz.tipo = "Cliente",
					nInterfaz.alm_id = cliente._id;
				nInterfaz.xd_id = IDClienteXD;
				nInterfaz.save();
			}
			res.status(200).send(cliente);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function update(req, res) {
	let _id = req.body.id;
	req.body.fechaEdita = new Date();

	ClienteFiscal.updateOne({ _id: _id }, { $set: req.body })
		.then((updated) => {
			res.status(200).send(updated);
		}).catch((error) => {
			res.status(200).send(error);
		});
}

function _delete(req, res) {
	let _id = req.body.clienteFiscal_id;

	let item = {
		statusReg: "BAJA",
		fechaElimina: new Date()
	}
	ClienteFiscal.updateOne({ _id: _id }, { $set: item })
		.then((cliente) => {
			res.status(200).send(cliente);
		}).catch((error) => {
			res.status(500).send(error);
		});

}

function getByTarifa(req, res) {
	let tipoTarifaPrecio = req.params.tipoTarifaPrecio;

	ClienteFiscal.find({ tipoTarifaPrecio: tipoTarifaPrecio, statusReg: "ACTIVO", })
		.then((cliente) => {
			res.status(200).send(cliente);
		})
		.catch((error) => {
			res.status(500).send(error);
		});
}

function setHasTarifa(_id) {
	ClienteFiscal.updateOne({ _id: _id }, { $set: { hasTarifa: true } }).exec();
}

function removeTarifa(_id) {
	ClienteFiscal.updateOne({ _id: _id }, { $set: { hasTarifa: false } }).exec();
}

function getValidacionCliente(req, res) {
	let nCliente = new ClienteFiscal(req.body);

	ClienteFiscal.find({ rfc: nCliente.rfc })
		.then((cliente) => {
			res.status(200).send(cliente);
		})
		.catch((error) => {
			res.status(500).send(error);
		})
}

async function gethideColumns(req, res) {
	let idCliente = req.body.idClienteFiscal;
	let columns = req.body.columns;
	let resultcolumns=[];
	let embalajesarr=[];
	let resultciclo=true;
	ClienteFiscal.find({ _id: idCliente })
		.then(async (cliente) => {
			if(cliente[0].arrEmbalajes != undefined){
				let arrembalajes=cliente[0].arrEmbalajes.split(",");
				await Embalaje.find({ status: "ACTIVO" }).then(async (embalajes) => 
				{
					await Helper.asyncForEach(embalajes, async function (embalaje) {
						resultciclo=true;
						//console.log(embalaje.clave);
						arrembalajes.forEach( emb=>{
							//console.log(emb);
							if(embalaje.clave == emb)
								resultciclo=false;
						});

						if(resultciclo == true)
							embalajesarr.push(embalaje.clave)
					})
				});
				//console.log(embalajesarr);
				columns.forEach(column => {

					resultciclo=false;
					//console.log(column);
					embalajesarr.forEach( embalaje=>{
						//console.log(column.name.toLowerCase()+"=="+embalaje);
						if(column.name.toLowerCase() == embalaje)
							resultciclo=true;
					});
					if(resultciclo == true)
						resultcolumns.push(column.idx)
				});
				//console.log(resultcolumns);
				res.status(200).send(resultcolumns);
			}
			if(cliente[0].arrEmbalajes == undefined)
				res.status(200).send(resultcolumns);
		})
		.catch((error) => {
			res.status(500).send(error);
		})
}

module.exports = {
	get,
	getByIDClienteFiscal,
	save,
	_delete,
	update,
	getByTarifa,
	setHasTarifa,
	removeTarifa,
	getValidacionCliente,
	gethideColumns
}