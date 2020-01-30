'use strict'
const ClienteFiscal = require('../models/ClienteFiscal');
const Helper = require('../helpers');
const Interfaz_ALM_XD = require('../models/Interfaz_ALM_XD');

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

	ClienteFiscal.find({tipoTarifaPrecio : tipoTarifaPrecio, statusReg: "ACTIVO", hasTarifa: false})
	.then((cliente) => {
		res.status(200).send(cliente);
	})
	.catch((error) => {
		res.status(500).send(error);
	});
}

function setHasTarifa(_id) {
	ClienteFiscal.updateOne({_id: _id}, {$set: {hasTarifa: true}}).exec();
}

function removeTarifa(_id) {
	ClienteFiscal.updateOne({_id: _id}, {$set: {hasTarifa: false}}).exec();
}

function getValidacionCliente(req, res) {
	let nCliente = new ClienteFiscal(req.body);

	ClienteFiscal.find({nombreCorto: nCliente.nombreCorto})
	.then((cliente) => {
		res.status(200).send(cliente);
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
	getValidacionCliente
}