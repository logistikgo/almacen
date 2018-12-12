const PDF = require('pdfkit');
const Entrada = require('./models/Entrada');
const Salida = require('./models/Salida');
const MovimientoInventario = require('./models/MovimientoInventario');
const ClienteFiscal = require('./models/ClienteFiscal');
const fs = require('fs');
const moment = require('moment');
const blobstream = require('blob-stream');


async function getPartidasByIDs(req,res){
	
	let _arrClientesFiscales = req.query.arrClientesFiscales;
	let _arrSucursales = req.query.arrSucursales;
	let _arrAlmacenes = req.query.arrAlmacenes;
	let fechaI = req.query.fechaInicio;
	let fechaF = req.query.fechaFinal;
	let tipo = req.query.tipo;

	
	if(fechaI==null){
		let infoPartidasGrl = await getPartidas(_arrClientesFiscales,_arrSucursales,_arrAlmacenes);
		await res.status(200).send(infoPartidasGrl);
	}else{
		let infoPartidasFiltro = await getPartidasFiltro(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,fechaI,fechaF,tipo);
		await res.status(200).send(infoPartidasFiltro);
	}

}

async function getPartidasFiltro(_arrClientesFiscales,_arrSucursales,_arrAlmacenes,fechaI,fechaF,tipo){
	let infoPartidasFiltro = [];
	let boolFechas = fechaI==fechaF;
	
	let rango = {
		$gte:new Date(fechaI),
		$lt:new Date(fechaF)
	};

	let filtroEntrada = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes}
	};
	let filtroSalida = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:_idSucursal,
		almacen_id:_idAlmacen
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

async function getPartidas(_arrClientesFiscales,_arrSucursales,_arrAlmacenes){
	let infoPartidasGrl = [];

	let filtro = {
		clienteFiscal_id: {$in:_arrClientesFiscales},
		idSucursal:{$in:_arrSucursales},
		almacen_id:{$in:_arrAlmacenes}
	};

	let partidasEntrada = await getPartidasEntradas(filtro);
	let partidasSalida = await getPartidasSalidas(filtro);

	infoPartidasGrl = partidasEntrada.concat(partidasSalida);
	return infoPartidasGrl;
}

async function getPartidasEntradas(filtro){
	let infoPartidasEntradas = [];
	let entradas = await Entrada.find(filtro)
		.populate({
			path:'partidas.producto_id',
			model:'Producto'
		})
		.populate({
			path:'clienteFiscal_id',
			model:'ClienteFiscal'
		})
		.exec();
		
	await entradas.forEach(function(entrada){
		let entry = entrada;
		entrada.partidas.forEach(function(partida){
			let json = {
				infoPartida:partida,
				infoEntrada:entry
			}
			infoPartidasEntradas.push(json);
		});
	});

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

async function formatEmbalajes(req,res){
	let isEntrada = req.body.isEntrada;
	let isSalida = req.body.isSalida;

	if(isEntrada == 1){

		Entrada.find({})
		.then((entradas)=>{
			entradas.forEach(function(entrada){
				
				entrada.partidas.forEach(
					function(partida){
						let embalajes = {
							tarimas:partida.tarimas,
							piezas:partida.piezas,
							cajas:partida.cajas
						};

						partida['embalajes'] = embalajes;
					}
				);

				
				
				let partidas = entrada.partidas;

				Entrada.updateOne({folio:entrada.folio},{$set:{partidas}})
				.then((updated)=>{
					console.log("Alright");
				})
				.catch((err)=>{
					console.log("error",err);
				});

			});
			
			res.status(200).send("Finished");
		})
		.catch((err)=>{
			res.status(500).send("Error en el find");
		});
	} else if (isSalida == 1){
		Salida.find({})
		.then((salidas)=>{
			salidas.forEach(function(salida){
				
				salida.partidas.forEach(
					function(partida){
						let embalajes = {
							tarimas:partida.tarimas,
							piezas:partida.piezas,
							cajas:partida.cajas
						};

						partida['embalajes'] = embalajes;
					}
				);				
				
				let partidas = salida.partidas;

				Salida.updateOne({folio:salida.folio},{$set:{partidas}})
				.then((updated)=>{
					console.log("Alright");
				})
				.catch((err)=>{
					console.log("error",err);
				});

			});
			
			res.status(200).send("Finished");
		})
		.catch((err)=>{
			res.status(500).send("Error en el find");
		});
	} else {
		MovimientoInventario.find({})
		.then((movimientos)=>{

			movimientos.forEach(function(movimiento){
				
				let embalajes = {
					tarimas:movimiento.tarimas,
					piezas:movimiento.cantidad,
					cajas:movimiento.cajas
				};
				
				MovimientoInventario.updateOne({_id:movimiento._id},{$set:{embalajes}})
				.then((updated)=>{
					console.log("Alright");
				})
				.catch((err)=>{
					console.log("Error en el update");
				});
			});
			res.status(200).send("Finished");
		})
		.catch((err)=>{
			res.status(500).send("Error en find");
		});
	}
}

async function formatItems1(req,res){
	let arrFolio = req.body.arrFolio;
	let arrItem = req.body.arrItem;
	let entrada = req.body.entrada;

	if(entrada == 1){
		arrFolio.forEach(function(elem){

		});

		Entrada.find({folio:{$in:arrFolio}})
		.then((entradas)=>{
			entradas.forEach(function(entrada){
				let index = arrFolio.indexOf(entrada.folio);
				Entrada.updateOne({folio:entrada.folio},{$set:{item:arrItem[index]}});
			});
		})
		.catch((error)=>{

		});
	}
}

async function FormatItems(req,res){
	let item = req.body.item;
	let inicio = req.body.inicio;
	let fin = req.body.fin;
	let entrada = req.body.entrada;
	
	if(entrada==1){
		Entrada.find({})
		.then((entradas)=>{
			entradas.forEach(async function(entrada){
				let folio = parseInt(entrada.folio);

				if(folio>=inicio && folio<=fin){
					console.log(item);
					let itemString = item + "";
					Entrada.updateOne({folio:entrada.folio},{$set:{item:itemString}})
					.then((updated)=>{
						
						//console.log("Alright");
					})		
					.catch((error)=>{
						console.log("Error");
					});
					item++;
				}
			});
			res.status(200).send("Finished");
		}).catch((error)=>{
			res.status(500).send(error);
		});
	}else{
		Salida.find({})
		.then((salidas)=>{
			salidas.forEach(async function(salida){
				let folio = parseInt(salida.folio);

				if(folio>=inicio && folio<=fin){
					console.log(item);
					let itemString = item + "";
					Salida.updateOne({folio:salida.folio},{$set:{item:itemString}})
					.then((updated)=>{
						
						//console.log("Alright");
					})		
					.catch((error)=>{
						console.log("Error");
					});
					item++;
				}
			});
			res.status(200).send("Finished");
		}).catch((error)=>{
			res.status(500).send(error);
		});
	}
		
}

async function FormatProduct(req,res){
	let mainID = req.body.mainID;
	let secondID = req.body.secondID;
	let thirdID = req.body.thirdID;

	Entrada.find({"folio":"6"})
	.then((entradas)=>{
		entradas.forEach(function(entrada){
			entrada.partidas.forEach(function(partida){
				if(partida.producto_id == secondID || partida.producto_id == thirdID){
					partida.producto_id = mainID;
				}
			});
			let partidas = {
				partidas:entrada.partidas
			};
			Entrada.updateOne({_id:entrada._id},{$set:partidas})
			.then((updated)=>{
				console.log("Updateado");
			})
			.then((error)=>{
				console.log("Error");
			});
		});
	})
	.catch((error)=>{

	});
}

async function getNextID(dataContext, field){
	let max = 0;
	let lastUser = await dataContext.find().sort([[field,-1]]).exec();
	
	if(lastUser.length > 0)
		max = (lastUser[0])[field];

	console.log(max);

	return max + 1;
}

async function PDFEntrada(entrada_id){

	let entrada = await Entrada.findOne({_id:entrada_id})
		.populate({
			path:'partidas.producto_id',
			model:'Producto'
		}).exec();

	let clienteFiscal = await ClienteFiscal.findOne({idCliente:entrada.idClienteFiscal}).exec();

	let doc = new PDF();
	doc.pipe(fs.createWriteStream(`${entrada.folio}.pdf`));
	//doc.pipe(blobstream());

	//LOGO
	doc.image('logo1.PNG',20,20);
	//Datos de la empresa
	doc.font('Helvetica-Bold')
	.fontSize(12)
	.fill('black')
	.text('Logisti-K División Distribución',20,50);
	doc.font('Helvetica')
	.fontSize(10)
	.text('EJE 122 No. 380 380-A, SAN LUIS POTOSI, S.L.P',20,65)
	.text('C.P 78395',20,75);

	//Titulo del documento
	doc.font('Helvetica-Bold')
	.fontSize(20)
	.fill('#a0133b')
	.text('PACKING LIST',400,20);

	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('black')
	.text('Fecha:',400,50)
	.text('Cliente:',400,65);

	//Datos fecha y cliente fiscal
	doc.font('Helvetica')
	.fontSize(10)
	.fill('black')
	.text(`${moment(entrada.fechaEntrada).format("DD/MM/YYYY")}`,440,50)
	.text(`${clienteFiscal.nombreCorto}`,440,65);

	//Rectangulo Datos Generales
	doc.font('Helvetica')
	.fontSize(10)
	.rect(20,125,220,20)
	.fill('#a0133b')
	.lineWidth(1)
	.stroke();

	//Titulo Datos Generales
	doc.font('Helvetica-Bold')
	.fontSize(12)
	.fill('white')
	.text('DATOS GENERALES',70,130);

	//titulos datos generales
	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('black')
	.text('Folio',25,150)
	.text('Acuse pedimento',25,165)
	.text('Transportista',25,180)
	.text('Operador',25,195)
	.text('Unidad',25,210)
	.text('Tipo',25,235);

	//Datos generales
	doc.font('Helvetica')
	.fontSize(10)
	.fill('black')
	.text(`${entrada.folio}`,130,150)
	.text(`${entrada.acuse}`,130,165)
	.text(`${entrada.transportista}`,130,180)
	.text(`${entrada.status}`,130,195)
	.text(`${entrada.unidad}`,130,210)
	.text('ENTRADA',130,235);

	//Rectangulo informacion entrada
	doc.rect(20,260,570,20)
	.fill('#a0133b')
	.stroke();

	//Titulos informacion entrada
	doc.font('Helvetica-Bold')
	.fontSize(12)
	.fill('white')
	.text('FACTURA',30,265)
	.text('REFERENCIA',180,265)
	.text('ORDEN DE COMPRA',310,265)
	.text('VALOR',490,265);

	//Rectangulo datos de informacion entrada
	doc.rect(20,281,570,20)
	.lineWidth(1)
	.stroke();

	//Datos de informacion entrada
	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('black')
	.text(`${entrada.factura}`,30,286)
	.text(`${entrada.referencia}`,180,286)
	.text(`${entrada.ordenCompra}`,310,286)
	.text(`${entrada.valor}`,490,286);

	//Rectangulo partidas
	doc.rect(20,330,570,20)
	.fill('#a0133b')
	.stroke();

	//Titulos partidas
	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('white')
	.text('LOTE',30,335)
	.text('CLAVE',70,335)
	.text('DESCRIPCIÓN',140,335)
	.text('PZS',250,335)
	.text('TAR',310,335)
	.text('CJS',370,335)
	.text('P. BRUTO',430,335)
	.text('P. NETO',500,335);

	//Rectangulos partidas 
	let anchoRectangle = 351;
	entrada.partidas.forEach(function(partida){
		doc.rect(20,anchoRectangle,570,20)
		.lineWidth(1)
		.stroke();

		doc.font('Helvetica')
		.fontSize(10)
		.fill('black')
		.text(`${partida.lote}`,30,anchoRectangle+5)
		.text(`${partida.producto_id.clave}`,70,anchoRectangle+5)
		.text(`${partida.producto_id.descripcion}`,140,anchoRectangle+5)
		.text(`${partida.piezas}`,250,anchoRectangle+5)
		.text(`${partida.tarimas}`,310,anchoRectangle+5)
		.text(`${partida.cajas}`,370,anchoRectangle+5)
		.text(`${partida.pesoBruto}`,430,anchoRectangle+5)
		.text(`${partida.pesoNeto}`,500,anchoRectangle+5);
		anchoRectangle+=20;
	});


	doc.end();
}


module.exports = {
	getNextID,
	PDFEntrada,
	formatEmbalajes,
	FormatItems,
	getPartidasByIDs
}



/*
let doc = new PDF();
	doc.pipe(fs.createWriteStream(`example.pdf`));

	//LOGO
	doc.image('logo1.PNG',20,20);
	//Datos de la empresa
	doc.font('Helvetica-Bold')
	.fontSize(12)
	.fill('black')
	.text('Logisti-K División Distribución',20,50);
	doc.font('Helvetica')
	.fontSize(10)
	.text('EJE 122 No. 380 380-A, SAN LUIS POTOSI, S.L.P',20,65)
	.text('C.P 78395',20,75);

	//Titulo del documento
	doc.font('Helvetica-Bold')
	.fontSize(20)
	.fill('#a0133b')
	.text('PACKING LIST',400,20);

	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('black')
	.text('Fecha:',400,50)
	.text('Cliente:',400,65);

	//Datos fecha y cliente fiscal
	doc.font('Helvetica')
	.fontSize(10)
	.fill('black')
	.text('31/10/18',440,50)
	.text('Hoesch Metallurgie',440,65);

	//Rectangulo Datos Generales
	doc.font('Helvetica')
	.fontSize(10)
	.rect(20,125,220,20)
	.fill('#a0133b')
	.lineWidth(1)
	.stroke();

	//Titulo Datos Generales
	doc.font('Helvetica-Bold')
	.fontSize(12)
	.fill('white')
	.text('DATOS GENERALES',70,130);

	//titulos datos generales
	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('black')
	.text('Folio',25,150)
	.text('Acuse pedimento',25,165)
	.text('Transportista',25,180)
	.text('Operador',25,195)
	.text('Placas trailer',25,210)
	.text('Placas remolque',25,225);

	//Datos generales
	doc.font('Helvetica')
	.fontSize(10)
	.fill('black')
	.text('I0001/31-10-18',130,150)
	.text('Pedimento 1',130,165)
	.text('Fletes marroquín',130,180)
	.text('José Villar',130,195)
	.text('FERX-34',130,210)
	.text('RFTX-78',130,225);

	//Rectangulo informacion entrada
	doc.rect(20,260,570,20)
	.fill('#a0133b')
	.stroke();

	//Titulos informacion entrada
	doc.font('Helvetica-Bold')
	.fontSize(12)
	.fill('white')
	.text('FACTURA',30,265)
	.text('REFERENCIA',180,265)
	.text('ORDEN DE COMPRA',310,265)
	.text('VALOR',490,265);

	//Rectangulo datos de informacion entrada
	doc.rect(20,281,570,20)
	.lineWidth(1)
	.stroke();

	//Datos de informacion entrada
	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('black')
	.text('12345TY7',30,286)
	.text('REF-123409',180,286)
	.text('123R',310,286)
	.text('$450',490,286);

	//Rectangulo partidas
	doc.rect(20,330,570,20)
	.fill('#a0133b')
	.stroke();

	//Titulos partidas
	doc.font('Helvetica-Bold')
	.fontSize(10)
	.fill('white')
	.text('LOTE',30,335)
	.text('CLAVE',70,335)
	.text('DESCRIPCIÓN',140,335)
	.text('PZS',250,335)
	.text('TAR',310,335)
	.text('CJS',370,335)
	.text('P. BRUTO',430,335)
	.text('P. NETO',500,335);

	//Rectangulos partidas 

	doc.rect(20,351,570,20)
	.lineWidth(1)
	.stroke();

	doc.font('Helvetica')
	.fontSize(10)
	.fill('black')
	.text('Lote1',30,356)
	.text('Clave',70,356)
	.text('Descripcion',140,356)
	.text('12',250,356)
	.text('0',310,356)
	.text('2',370,356)
	.text('1070',430,356)
	.text('1000',500,356);


	doc.end();*/




