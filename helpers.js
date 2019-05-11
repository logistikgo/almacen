//const PDF = require('pdfkit');
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
	//let partidasSalida = await getPartidasSalidas(filtro);

	//infoPartidasGrl = partidasEntrada.concat(partidasSalida);
	//return infoPartidasGrl;
	return partidasEntrada;
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
		.populate({
			path:'almacen_id',
			model:'Almacen'
		})
		.populate({
			path:'salidas_id',
			model:'Salida'
		})
		.exec();
	//console.log("-------------------------------------------------");
	
	delete filtro.fechaEntrada;
	let salidas = await Salida.find(filtro);
	console.log(filtro);
	//console.log(salidas);
	await entradas.forEach(async function(entrada){
		let entry = entrada;

		
		let partidasDeSalida = salidas.filter(x=> x.entrada_id == entrada._id.toString()).map(x=>x.partidas);
		
		entrada.partidas.forEach(function(partida){
			//--------------------------------
			
			let partidaSalidaDeEntrada = entrada.partidasSalida.find(x=> x.clave_partida == partida.clave_partida);
			//console.log(salidas);
			partida.isEmpty = partidaSalidaDeEntrada.isEmpty;
			let salida = salidas.filter(x=> x.entrada_id == entrada._id.toString() && x.partidas[0]._id.toString() == partidaSalidaDeEntrada._id.toString());
			//console.log("SE IMPRIMEN LAS SALIDAS");
			//console.log(salida);
			let partidasDeSalidas = partidasDeSalida.filter(x=> x[0]._id.toString() == partidaSalidaDeEntrada._id.toString());
			let jsonPartidasSalida = [];
			partidasDeSalidas.forEach(function(partidalocal){
				jsonPartidasSalida.push(partidalocal[0]);
			});
			
			
			//---------------------------------------------------
			let json = {
				infoSalidas: salida,
				infoPartida:partida,
				infoPartidasSalida: jsonPartidasSalida,
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

	console.log(max);

	return max + 1;
}

async function formatPartidasSalida(req,res){
	Entrada.find({})
	.then((entradas)=>{
		entradas.forEach(function(entrada){
			let partidasSalida = entrada.partidas;

		});
	});
}

/*
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
}*/


module.exports = {
	getNextID,
	getPartidasByIDs
}