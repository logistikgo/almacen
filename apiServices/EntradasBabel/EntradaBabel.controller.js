
const mongoose = require('mongoose');
const Entrada = require('../Entradas/Entrada.model');
const Producto = require('../Producto/Producto.model');
const Salida = require('../Salidas/Salida.model');
const Partida = require('../Partida/Partida.controller');
const PasilloCtr = require('../Pasillos/Pasillo.controller');
const EmbalajesController = require('../Embalaje/Embalaje.controller');
const PartidaModel = require('../Partida/Partida.model');
const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.model');
const Helper = require('../../services/utils/helpers');
const MovimientoInventario = require('../MovimientosInventario/MovimientoInventario.controller');
const MovimientoInventarioModel = require('../MovimientosInventario/MovimientoInventario.model');
const Interfaz_ALM_XD = require('../Interfaz_ALM_XD/Interfaz_ALM_XD.controller');
const TiempoCargaDescarga = require('../TiempoCargaDescarga/TiempoCargaDescarga.controller');
const PlantaProductora = require('../PlantaProductora/PlantaProductora.model'); 
const dateFormat = require('dateformat');
const Ticket = require('../Ticket/Ticket.model');

function getNextID() {
	return Helper.getNextID(Salida, "salida_id");
}

async function saveEntradaBabel(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	//console.log("1");
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
	for (var i=0; i<req.body.Pedido.length ; i++) {
		//console.log(req.body.Pedido[i]);
		if(req.body.Pedido[i] !== undefined && req.body.Pedido[i].Clave !== undefined && req.body.Pedido[i].NO !== undefined)
		{
			console.log("test");
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			if(producto==undefined)
				return res.status(500).send("no existe item: "+req.body.Pedido[i].Clave);
			let fechaCaducidadTemp=req.body.Pedido[i].Caducidad.length > 8 ? req.body.Pedido[i].Caducidad.replace(/M/g, "") :req.body.Pedido[i].Caducidad;
			let fechaCaducidadRes= fechaCaducidadTemp.length == 8 ? Date.parse(fechaCaducidadTemp.slice(0, 4)+"/"+fechaCaducidadTemp.slice(4, 6)+"/"+fechaCaducidadTemp.slice(6, 8)):Date.parse(fechaCaducidadTemp.slice(0, 4)+"/"+fechaCaducidadTemp.slice(5, 7)+"/"+fechaCaducidadTemp.slice(8, 10));
			if(isNaN(fechaCaducidadRes))
	        {
	        	fechaCaducidadRes= fechaCaducidadTemp.length == 8 ? Date.parse(fechaCaducidadTemp.slice(0, 2)+"/"+fechaCaducidadTemp.slice(2, 4)+"/"+fechaCaducidadTemp.slice(4, 8)):Date.parse(fechaCaducidadTemp.slice(0, 2)+"/"+fechaCaducidadTemp.slice(3, 5)+"/"+fechaCaducidadTemp.slice(6, 10));
	        }
	        let today=new Date(Date.now()-(5*3600000));
	        fechaCaducidadRes= new Date(fechaCaducidadRes);
	        let days=(producto.garantiaFrescura ? producto.garantiaFrescura : 85)-1;
	        if(fechaCaducidadRes.getTime()<(today.getTime()+days*86400000)) 
	        	return res.status(500).send("No cumple con la fecha: "+req.body.Pedido[i].Clave); 
	        //console.log(producto.clave);
	        let indexFecha=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="FECHA/DATE");
			let fechaProducionplanta=Date.parse(req.body.Infoplanta[indexFecha+1].InfoPedido);
			fechaProducionplanta = new Date (fechaProducionplanta).getTime()-(7*3600000);
			if(fechaCaducidadRes < new Date(fechaProducionplanta+(70*3600000)))
			{
				return res.status(500).send("FechaMenor\n" + resORDENES+" ");


			}
	        console.log(req.body.Pedido[i].Caducidad);
			const data={
				producto_id:producto._id,
				clave:producto.clave,
				descripcion:producto.descripcion,
				origen:"BABEL",
				tipo: "NORMAL",
    			status: "WAITINGARRIVAL",
				embalajesEntrada: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	embalajesxSalir: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	fechaProduccion:new Date(fechaProducionplanta),
	        	fechaCaducidad: fechaCaducidadRes,
	        	lote:req.body.Pedido[i].Lote.replace(" ", "").trim(),
	        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
	        	valor:0
	        }
	        // console.log(data.InfoPedidos)
	        let countEntradas=await Entrada.find({"factura":req.body.Pedido[i].Factura}).exec();
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"referencia":req.body.Pedido[i].Factura}).exec():countEntradas;
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"item":req.body.Pedido[i].Factura}).exec():countEntradas;
	        console.log("test"+countEntradas.length)
    		if(countEntradas.length ==0)
    		{
		        if(arrPO.find(obj=> (obj.factura == req.body.Pedido[i].Factura)))
	    		{
	    			//console.log("yes");
	    			let index=arrPO.findIndex(obj=> (obj.factura == req.body.Pedido[i].Factura));
	    			arrPO[index].arrPartidas.push(data)
		    	}
		        else{
		        	//console.log("NO");
		        	
			        	arrPartidas.push(data);
			        	const PO={
						po:req.body.Pedido[i].NoOrden,
						factura:req.body.Pedido[i].Factura,
			        	arrPartidas:[]
			        	}
			        	PO.arrPartidas.push(data)
		    			arrPO.push(PO);
		    		}
		    		
	    	} 
    		if(countEntradas.length >0)
    		{
    			resORDENES=resORDENES+req.body.Pedido[i].Factura+"\n";
    		}
	        
    	}
    	else
    	{
    		if(resORDENES =="" && req.body.Pedido[i].Clave == undefined && arrPO.length<1 && i>6)
    			return res.status(500).send("clave no existe\n" + resORDENES+" ");
    	}
	}
	if(resORDENES != "" && arrPO.length<1)
	{

		//arrPO=[];
		return res.status(500).send("Ya existe las Remisiones:\n" + resORDENES+" ");
		
	}
	//console.log(arrPO);
	
	//console.log("test");
	//console.log(arrPartidas);
	let reserror="";
    var arrPartidas_id = [];
    var partidas = [];
	await Helper.asyncForEach(arrPO,async function (noOrden) {
		arrPartidas_id = [];
    	partidas = [];
	    await Helper.asyncForEach(noOrden.arrPartidas, async function (partida) {
	        partida.InfoPedidos[0].IDAlmacen=req.body.IdAlmacen;
	        let nPartida = new PartidaModel(partida);
	        //console.log(nPartida.InfoPedidos[0].IDAlmacen);
	        //console.log(nPartida);
	        await nPartida.save().then((partida) => {
	        	partidas.push(partida)
	            arrPartidas_id.push(partida._id);
	        });
	    });
	  //  console.log(partidas);
	    //console.log(arrPartidas_id);
	    let indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="PLANTAEXPORTADORA/MANUFACTURINGPLANT");
	    console.log(indexInfopedido);
	    let planta="";

	    if(req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] == "PLANTA" && indexInfopedido != -1)
		 	planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[1] }).exec();
		else
			planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] }).exec();
		//console.log("__------------------------------------------------"+planta);
		if(planta==null)
		{
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="PLANTAEXPORTADORA");
			//console.log("AQUI----------------------------------"+req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0]);
			if(req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] == "PLANTA")
			 	planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[1] }).exec();
			else
				planta=await PlantaProductora.findOne({ 'Nombre': req.body.Infoplanta[indexInfopedido+1].InfoPedido.split(" ")[0] }).exec();
		}
		console.log(req.body.Infoplanta[indexInfopedido+1].InfoPedido);
		//console.log(indexInfopedido);
		indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="FECHA/DATE");
		//console.log(Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido));
		let fechaSalidaPlanta=Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido);
		//console.log(Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido));
		let fechaesperada=Date.parse(req.body.Infoplanta[indexInfopedido+1].InfoPedido)+((60 * 60 * 24 * 1000)*planta.DiasTraslado+1);

		//console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
		if (partidas && partidas.length > 0) {
			let idCliente = req.body.IDClienteFiscal;
			let idSucursales = req.body.IDSucursal;

			let nEntrada = new Entrada();

			nEntrada.fechaEntrada = new Date(fechaesperada);
			nEntrada.fechaEsperada = new Date(fechaesperada);
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BarcelBabel";
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRACTOR-PLACAS/TRUCK-NUMBERPLATE");
			if(indexInfopedido==-1)
				indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRACTOR/TRAILER");
			nEntrada.tracto = req.body.Infoplanta[indexInfopedido+1].InfoPedido;

			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="CONTENEDOR/TRAILER");
			if(indexInfopedido==-1)
				indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="CONTENEDOR/CONTAINER");
			nEntrada.remolque = req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			
			nEntrada.referencia = noOrden.factura;
			nEntrada.factura = noOrden.factura;
			nEntrada.item = noOrden.factura;
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRANSPORTISTA/CARRIER");
			if(indexInfopedido==-1)
				indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="TRANSPORTISTA/CARGOLINE");
			nEntrada.transportista = req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="CONDUCTOR/DRIVER");
			nEntrada.operador = req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			indexInfopedido=req.body.Infoplanta.findIndex((obj) => obj.InfoPedido.replace(/\s+/g, "") =="SELLOS/SEALS");
			nEntrada.sello=req.body.Infoplanta[indexInfopedido+1].InfoPedido;
			await new Promise(resolve => {
					let time=(Math.random() * 5000)*10;
			        setTimeout(resolve,time );
			        //poconsole.log(time);
			    });
			nEntrada.ordenCompra=noOrden.po;
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			nEntrada.plantaOrigen=planta.Nombre;
			nEntrada.DiasTraslado=planta.DiasTraslado;
		 	
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			
			nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");

					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					
					//console.log(partidas);
					/*console.log(entrada);
					console.log("/------------------/")*/
				}).catch((error) => {
					console.log(error);
					reserror=error
				});
		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		}
	});
		if(reserror!= "")
		{
			console.log(reserror)
			return res.status(500).send(reserror);
		}
		else{
			//console.log("testFINAL")
			return res.status(200).send("OK");
		}
	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			console.log(error);
	};
	return res.status(200).send("OK");
}

async function updateEntradasBabel(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);

	try{	
		
        let countEntradas=await Entrada.findOne({"referencia":req.body.Remision}).exec();
        //console.log(countEntradas);
        countEntradas= countEntradas == null ? await Entrada.findOne({"factura":req.body.Remision}).exec():countEntradas;
        //console.log(countEntradas);
        countEntradas= countEntradas == null ? await Entrada.findOne({"item":req.body.Remision}).exec():countEntradas;
        //console.log(countEntradas);
        let dataSplit=req.body.FechaPlanta.split('/');
        let fechaSalidaPlanta=new Date (dataSplit[2], dataSplit[1]-1 , dataSplit[0]); 
       //console.log(fechaSalidaPlanta.toString());
		if(countEntradas)
		{	

	    	if(countEntradas.fechaSalidaPlanta == undefined){
	    		countEntradas.fechaSalidaPlanta =fechaSalidaPlanta;
	    		countEntradas.save();
	    	}
	    	
	    		
    	} 
    	else
    		return res.status(200).send("No existe: "+req.body.Remision);
    	return res.status(200).send("OK");
	}catch(error){
			console.log(error)
			res.status(500).send(error);
			console.log(error);
	};
	//console.log("end");
}
//Valida que la entrada ya existe o no, devolviendo true o false
async function validaEntradaDuplicado(embarque) {
	let entradas = await Entrada.find({ embarque: embarque }).exec();
	//console.log(entradas);
	if (entradas.length > 0) {
		return true;
	} else {
		return false;
	}
}


async function saveEntradaEDI(req, res) {

	var mongoose = require('mongoose');
	var errores="";
	let finish="OK"
	//console.log(req.body);
	try{
		await Helper.asyncForEach(req.body.respuestaJson,async function (Entradas) {
			var arrPartidas_id = [];
			var partidas = [];
			//console.log(Entradas)
			let countEntradas=await Entrada.find({"ordenCompra":Entradas.Entrada.ordenCompra,"item":Entrada.item}).exec();
			//console.log(countEntradas.length);
			if(countEntradas.length <1)
			{
				//console.log("test");
				await Helper.asyncForEach(Entradas.Partidas,async function (EDIpartida){
					//console.log(EDIpartida);
					if(EDIpartida.partida !== undefined && EDIpartida.partida.clave !== undefined)
					{
					
						var producto=await Producto.findOne({ 'clave':EDIpartida.partida.clave }).exec();
						if(producto==undefined)
							return res.status(400).send("no existe item: "+EDIpartida.partida.clave);
						let fechaProduccion = EDIpartida.partida.fechaProduccion;
						let fechaCaducidad = EDIpartida.partida.fechaCaducidad;
				        //console.log(new Date(fechaProduccion) );
						const data={
							producto_id:producto._id,
							clave:producto.clave,
							descripcion:producto.descripcion,
							origen:"BABEL",
							tipo: "NORMAL",
			    			status: "WAITINGARRIVAL",
							embalajesEntrada: { cajas:parseInt(EDIpartida.partida.CantidadxEmbalaje)},
				        	embalajesxSalir: { cajas:parseInt(EDIpartida.partida.CantidadxEmbalaje)},
				        	fechaProduccion:new Date(fechaProduccion),
				        	fechaCaducidad: new Date(fechaCaducidad),
				        	lote:EDIpartida.partida.lote,
				        	InfoPedidos:[{ "IDAlmacen": Entradas.Entrada.IdAlmacen}],
				        	valor:0
				        }
				        //console.log(data);
				        data.InfoPedidos[0].IDAlmacen=Entradas.Entrada.IdAlmacen;
				        let nPartida = new PartidaModel(data);
				        await nPartida.save().then((partida) => {
				        	partidas.push(partida)
				            arrPartidas_id.push(partida._id);
				        });
			    	}
			    });

				if (partidas && partidas.length > 0) {
					let idCliente = Entradas.Entrada.IDClienteFiscal;
					let idSucursales = Entradas.Entrada.IDSucursal;
					let idAlmacen = Entradas.Entrada.IdAlmacen;

					let nEntrada = new Entrada();

					nEntrada.fechaEntrada = new Date(Entradas.Entrada.fechaEsperada);
					nEntrada.fechaEsperada= new Date(Entradas.Entrada.fechaEsperada);
					nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
					nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
						return total + valor;
					});
					nEntrada.almacen_id=idAlmacen;
					nEntrada.clienteFiscal_id = idCliente;
					nEntrada.sucursal_id = idSucursales;
					nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
					nEntrada.tipo = "NORMAL";
					nEntrada.partidas = partidas.map(x => x._id);
					nEntrada.nombreUsuario = "NiagaraBabel";
					
					nEntrada.referencia = Entradas.Entrada.referencia;
					nEntrada.factura = Entradas.Entrada.item;
					nEntrada.item = Entradas.Entrada.item;
					nEntrada.transportista = Entradas.transportista;
					nEntrada.ordenCompra=Entradas.Entrada.ordenCompra;
					nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
					nEntrada.idEntrada = await getNextID();
					nEntrada.folio = await getNextID();
					nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
					//nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
					//if()
					//nEntrada.stringFolio = 
					//
					//console.log("testEntrada");
					await nEntrada.save()
						.then(async (entrada) => {
							//console.log("testpartidas");
							finish="done";
							await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
							//console.log(partidas);
							/*console.log(entrada);
							console.log("/------------------/")*/
						}).catch((error) => {
							reserror=error
						});
				}else {
					console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
					return res.status(500).send("error");
				}
			}
			else{
				errores="Ya existe la ordenCompra: "+Entradas.Entrada.ordenCompra
				console.log(errores);
			}
		});


	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			//console.log(error);
	};	
	if(errores!=="")
	{
		console.log("error")
		return res.status(200).send(errores);
	}
	else
		return res.status(200).send(finish);
	return res.status(200).send(finish);
}


async function saveEntradaChevron(req, res) {

	var mongoose = require('mongoose');
	var errores="";
	//console.log(req.body);
	try{
		var arrPartidas_id = [];
		var partidas = [];
		//console.log("test");
		await Helper.asyncForEach(req.body.Partidas,async function (partida){
			//console.log(EDIpartida);
			if(partida !== undefined && partida.clave !== undefined)
			{
				
				var producto=await Producto.findOne({'clave':partida.clave }).exec();
				//console.log(producto._id);
				if(producto == undefined){
					//console.log("testst")
					return res.status(200).send("no existe item: "+partida.clave);
				}
		        //console.log(new Date(fechaProduccion) );
		        let resultjson=[]
		        let embalaje={}
		        embalaje[partida.EMBALAJE.toLowerCase()]=partida.CantidadxEmbalaje;
		        //resultjson.push(embalaje);
		        embalaje=JSON.parse(JSON.stringify( embalaje ))
				const data={
					producto_id:producto._id,
					clave:producto.clave,
					descripcion:producto.descripcion,
					origen:"BABEL",
					tipo: "NORMAL",
	    			status: "WAITINGARRIVAL",
					embalajesEntrada: embalaje,
		        	embalajesxSalir: embalaje,
		        	fechaProduccion:new Date(Date.now()-(5*3600000)),
		        	fechaCaducidad: new Date(Date.now()-(5*3600000)),
		        	lote:"",
		        	InfoPedidos:[{ "IDAlmacen": "5ec3f773bfef980cf488b731"}],
		        	valor:0
		        }
		        //console.log(data);
		        
		        data.InfoPedidos[0].IDAlmacen="5ec3f773bfef980cf488b731";
		        let nPartida = new PartidaModel(data);
		        //console.log(nPartida);
		        //return res.status(200).send("no existe item: "+partida.clave);
		        await nPartida.save().then((partida) => {
		        	partidas.push(partida)
		            arrPartidas_id.push(partida._id);
		        });
	    	}
	    });

		if (partidas && partidas.length > 0) {
			let idCliente = "5ec3f839bfef980cf488b737";
			let idSucursales = "5e3342f322b5651aecafea05";

			let nEntrada = new Entrada();

			nEntrada.fechaEntrada = new Date(Date.now()-(5*3600000));
			nEntrada.fechaEsperada= new Date(Date.now()-(5*3600000))
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BabelChevron";
			
			nEntrada.referencia ="Entrada INICIAL";
			nEntrada.factura = "Entrada INICIAL";
			nEntrada.item = "Entrada INICIAL";
			nEntrada.transportista = "";
			nEntrada.ordenCompra="";
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			let stringTemp=await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//if()
			nEntrada.stringFolio =await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");
					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					//console.log(partidas);
					/*console.log(entrada);
					console.log("/------------------/")*/
				}).catch((error) => {
					reserror=error
				});
		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
			res.status(500).send("error");
		}
	}	
	catch(error){
			console.log(error)
			res.status(500).send(error);
			//console.log(error);
	};	
	if(errores!=="")
	{
		console.log("error")
		return res.status(200).send(errores);
	}
	else
		return res.status(200).send("OK");
}


async function saveEntradaPisa(req, res) {

	var mongoose = require('mongoose');
	var errores="";
	//console.log(req.body);
	try{
		var arrPartidas_id = [];
		var partidas = [];
		//console.log("test");
		await Helper.asyncForEach(req.body.Partidas,async function (partida){
			//console.log(EDIpartida);
			if(partida !== undefined && partida.clave !== undefined)
			{
				
				var producto=await Producto.findOne({'clave':partida.clave }).exec();
				//console.log(producto._id);
				if(producto == undefined){
					//console.log("testst")
					return res.status(200).send("no existe item: "+partida.clave);
				}
		        //console.log(new Date(fechaProduccion) );
		        let resultjson=[]
		        let embalaje={}
		        embalaje[partida.EMBALAJE.toLowerCase()]=parseInt(partida.CantidadxEmbalaje);
		        //resultjson.push(embalaje);
		        embalaje=JSON.parse(JSON.stringify( embalaje ))
				const data={
					producto_id:producto._id,
					clave:producto.clave,
					descripcion:producto.descripcion,
					origen:"BABEL",
					tipo: "NORMAL",
	    			status: "WAITINGARRIVAL",
					embalajesEntrada: embalaje,
		        	embalajesxSalir: embalaje,
		        	fechaProduccion:new Date(Date.now()-(5*3600000)),
		        	fechaCaducidad: new Date(Date.now()-(5*3600000)),
		        	lote:partida.lote,
		        	InfoPedidos:[{ "IDAlmacen": "5e680205a616fe231416025f"}],
		        	valor:0
		        }
		        //console.log(data);
		        
		        data.InfoPedidos[0].IDAlmacen="5e680205a616fe231416025f";
		        let nPartida = new PartidaModel(data);
		        //console.log(nPartida);
		        //return res.status(200).send("no existe item: "+partida.clave);
		       // console.log("beforepartidas")
		        await nPartida.save().then((partida) => {
		        	partidas.push(partida)
		            arrPartidas_id.push(partida._id);
		        });
		        //console.log("partidas")
	    	}
	    });

		if (partidas && partidas.length > 0) {
			let idCliente = "5f199a1f437d0b3a3c7d98c9";
			let idSucursales = "5d123ed1a5ec7398c4fc2c45";

			let nEntrada = new Entrada();

			nEntrada.fechaEntrada = new Date(Date.now()-(5*3600000));
			nEntrada.fechaEsperada= new Date(Date.now()-(5*3600000))
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BabelPISA";
			
			nEntrada.referencia ="1325320,1325239,1325081,1325085,1325086,1325080,1325087,1325082,1325083,1325084";
			nEntrada.factura = "1325320,1325239,1325081,1325085,1325086,1325080,1325087,1325082,1325083,1325084";
			nEntrada.item = "1325320,1325239,1325081,1325085,1325086,1325080,1325087,1325082,1325083,1325084";
			nEntrada.transportista = "";
			nEntrada.ordenCompra="";
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
			let stringTemp=await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//if()
			nEntrada.stringFolio =await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			//nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");
					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					//console.log(partidas);
					/*console.log(entrada);
					console.log("/------------------/")*/
				}).catch((error) => {
					reserror=error
				});
		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
			res.status(500).send("error");
		}
	}	
	catch(error){
			console.log(error)
			res.status(500).send(error);
			//console.log(error);
	};	
	if(errores!=="")
	{
		console.log("error")
		return res.status(200).send(errores);
	}
	else
		return res.status(200).send("OK");
}



async function saveEntradaCPD(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	console.log("1");
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
	for (var i=0; i<req.body.Pedido.length ; i++) {
		//console.log(req.body.Pedido[i]);
		if(req.body.Pedido[i] !== undefined && req.body.Pedido[i].Clave !== undefined )
		{
			//console.log("test");
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			if(producto==undefined)
				return res.status(500).send("no existe item: "+req.body.Pedido[i].Clave);
	        //console.log(producto.clave);
	        let fechaProducionplanta=Date.parse(req.body.Pedido[i].Caducidad.slice(6, 10)+"/"+req.body.Pedido[i].Caducidad.slice(3, 5)+"/"+req.body.Pedido[i].Caducidad.slice(0, 2));
				//console.log(fechaProducionplanta);
				let fechaSalidaPla=new Date (fechaProducionplanta);
			fechaProducionplanta = new Date (fechaProducionplanta).getTime()-(7*86400000);
			const data={
				producto_id:producto._id,
				clave:producto.clave,
				descripcion:producto.descripcion,
				origen:"BABEL",
				tipo: "NORMAL",
    			status: "WAITINGARRIVAL",
				embalajesEntrada: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	embalajesxSalir: { cajas:parseInt(req.body.Pedido[i].Cantidad)},
	        	fechaProduccion:fechaProducionplanta,
	        	//fechaCaducidad: fechaCaducidadRes,
	        	//lote:req.body.Pedido[i].Lote,
	        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
	        	valor:0
	        }
	       // console.log(data.InfoPedidos)
	        let countEntradas=await Entrada.find({"factura":req.body.Pedido[i].Factura}).exec();
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"referencia":req.body.Pedido[i].Factura}).exec():countEntradas;
	        countEntradas= countEntradas.length<1 ? await Entrada.find({"item":req.body.Pedido[i].Factura}).exec():countEntradas;
	        //console.log("test"+countEntradas.length)
    		if(countEntradas.length ==0)
    		{
		        if(arrPO.find(obj=> (obj.factura == req.body.Pedido[i].Factura)))
	    		{
	    			//console.log("yes");
	    			let index=arrPO.findIndex(obj=> (obj.factura == req.body.Pedido[i].Factura));
	    			arrPO[index].arrPartidas.push(data)
		    	}
		        else{
		        	//console.log("NO");
		        	
			        	arrPartidas.push(data);
			        	const PO={
						po:req.body.Pedido[i].NoOrden,
						fechasalida:fechaSalidaPla,
						factura:req.body.Pedido[i].Factura,
						trailer:req.body.Pedido[i].trailer,
						sello:req.body.Pedido[i].sello,
						chofer:req.body.Pedido[i].chofer,
						transportista:req.body.Pedido[i].transporte,
			        	arrPartidas:[]
			        	}
			        	PO.arrPartidas.push(data)
		    			arrPO.push(PO);
		    		}
		    		
	    	} 
    		if(countEntradas.length >0)
    		{
    			resORDENES=resORDENES+req.body.Pedido[i].Factura+"\n";
    		}
	        
    	}
    	else
    	{
    		if(resORDENES =="" && req.body.Pedido[i].Clave == undefined && arrPO.length<1 && i>6)
    			return res.status(500).send("clave no existe\n" + resORDENES+" ");
    	}
	}
	if(resORDENES != "" && arrPO.length<1)
	{

		//arrPO=[];
		return res.status(500).send("Ya existe las Remisiones:\n" + resORDENES+" ");
		
	}
	//console.log(arrPO);
	
	//console.log("test");
	//console.log(arrPartidas);
	let reserror="";
    var arrPartidas_id = [];
    var partidas = [];
	await Helper.asyncForEach(arrPO,async function (noOrden) {
		arrPartidas_id = [];
    	partidas = [];
	    await Helper.asyncForEach(noOrden.arrPartidas, async function (partida) {
	        partida.InfoPedidos[0].IDAlmacen=req.body.IdAlmacen;
	        let nPartida = new PartidaModel(partida);
	        //console.log(nPartida.InfoPedidos[0].IDAlmacen);
	        //console.log(nPartida);
	        await nPartida.save().then((partida) => {
	        	partidas.push(partida)
	            arrPartidas_id.push(partida._id);
	        });
	    });
	   //console.log(partidas);
	    //console.log(noOrden.fechasalida.toString());
	    
		let fechaSalidaPlanta=Date.parse(noOrden.fechasalida);
		let fechaesperada=Date.parse(noOrden.fechasalida)+((60 * 60 * 24 * 1000)*7+1);

		//console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
		if (partidas && partidas.length > 0) {
			let idCliente = req.body.IDClienteFiscal;
			let idSucursales = req.body.IDSucursal;

			let nEntrada = new Entrada();
			//console.log(fechaesperada.toString())
			nEntrada.fechaEntrada = new Date(fechaesperada);
			nEntrada.fechaEsperada = new Date(fechaesperada);
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BarcelBabel";
			nEntrada.tracto = noOrden.trailer;			
			nEntrada.referencia = noOrden.factura;
			nEntrada.factura = noOrden.factura;
			nEntrada.item = noOrden.factura;
			nEntrada.transportista = noOrden.transportista;
			nEntrada.operador = noOrden.chofer;
			nEntrada.sello=noOrden.sello;
			await new Promise(resolve => {
					let time=(Math.random() * 5000)*10;
			        setTimeout(resolve,time );
			        //poconsole.log(time);
			    });
			nEntrada.ordenCompra=noOrden.po;
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
		 	
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			
			nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");

					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					
					//console.log(partidas);
					console.log(entrada.factura);
					console.log("/--------end----------/")
				}).catch((error) => {
					console.log(error);
					reserror=error
				});
		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		}
	});
		if(reserror!= "")
		{
			console.log(reserror)
			return res.status(500).send(reserror);
		}
		else{
			//console.log("testFINAL")
			return res.status(200).send("OK");
		}
	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			console.log(error);
	};
	console.log("ok");
	return res.status(200).send("OK");
}


async function saveEntradaBLO(req, res) {
	var mongoose = require('mongoose');
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	console.log("begin");
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	try{
	for (var i=0; i<req.body.Pedido.length ; i++) {
		//console.log(req.body.Pedido[i]);
		if(req.body.Pedido[i] !== undefined && req.body.Pedido[i].Clave !== undefined )
		{
			//console.log("test");
			var producto=await Producto.findOne({ 'clave': req.body.Pedido[i].Clave }).exec();
			if(producto==undefined)
				return res.status(500).send("no existe item: "+req.body.Pedido[i].Clave);
			if(producto.arrEquivalencias.length<1)
				return res.status(500).send("no existe equivalencia: "+req.body.Pedido[i].Clave);
	        //console.log(producto.clave);
	        let equivalencia=parseInt(producto.arrEquivalencias[0].cantidadEquivalencia);
	        let cantidadleft=(req.body.Pedido[i].Cantidad*-1)
	        //console.log("totalneed"+cantidadleft)
	        while(cantidadleft>0){
		        let fechaProducionplanta=Date.parse(req.body.Pedido[i].Caducidad);
					//console.log(fechaProducionplanta);
					let fechaSalidaPla=new Date (fechaProducionplanta);
				fechaProducionplanta = new Date (fechaProducionplanta).getTime()-(7*86400000);

				 let cantidadllegada=cantidadleft >= equivalencia ? equivalencia : cantidadleft;
		            cantidadleft-=equivalencia;
		            //console.log("left"+cantidadleft);
				const data={
					producto_id:producto._id,
					clave:producto.clave,
					descripcion:producto.descripcion,
					origen:"BABEL",
					tipo: "NORMAL",
	    			status: "WAITINGARRIVAL",
					embalajesEntrada: { cajas:cantidadllegada},
		        	embalajesxSalir: { cajas:cantidadllegada},
		        	fechaProduccion:new Date (fechaProducionplanta),
		        	//fechaCaducidad: fechaCaducidadRes,
		        	//lote:req.body.Pedido[i].Lote,
		        	InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
		        	valor:0
		        }
		        //console.log(data.fechaProduccion.toString())
		        let countEntradas=0;
		        /*countEntradas= countEntradas.length<1 ? await Entrada.find({"referencia":req.body.Pedido[i].Factura}).exec():countEntradas;
		        countEntradas= countEntradas.length<1 ? await Entrada.find({"item":req.body.Pedido[i].Factura}).exec():countEntradas;*/
		       //console.log("test"+countEntradas)
		       let NoOrder=req.body.Pedido[i].NoOrden.split(".")[0]
		      // console.log(NoOrder);
	    		if(countEntradas ==0)
	    		{
	    			console.log("testdome")
			        if(arrPO.find(obj=> (obj.po == NoOrder)))
		    		{
		    			//console.log("yes");
		    			let index=arrPO.findIndex(obj=> (obj.po == NoOrder));
		    			arrPO[index].arrPartidas.push(data)
			    	}
			        else{
			        	//console.log("NO");
			        		//console.log(data)
				        	arrPartidas.push(data);
				        	const PO={
							po:NoOrder,
							fechasalida:fechaSalidaPla,
							factura:req.body.Pedido[i].Factura,
							trailer:req.body.Pedido[i].trailer,
							sello:req.body.Pedido[i].sello,
							chofer:req.body.Pedido[i].chofer,
							transportista:req.body.Pedido[i].transporte,
				        	arrPartidas:[]
				        	}
				        	PO.arrPartidas.push(data)
				        //	console.log(PO);
			    			arrPO.push(PO);
			    		}
			    		
		    	} 
	    		if(countEntradas >0)
	    		{
	    			resORDENES=resORDENES+req.body.Pedido[i].Factura+"\n";
	    		}
	        }
    	}
    	else
    	{
    		if(resORDENES =="" && req.body.Pedido[i].Clave == undefined && arrPO.length<1 && i>6)
    			return res.status(500).send("clave no existe\n" + resORDENES+" ");
    	}
	}
	if(resORDENES != "" && arrPO.length<1)
	{

		//arrPO=[];
		return res.status(500).send("Ya existe las Remisiones:\n" + resORDENES+" ");
		
	}
	//console.log(arrPO);
	
	//console.log("test");
	//console.log(arrPartidas);
	let reserror="";
    var arrPartidas_id = [];
    var partidas = [];
	await Helper.asyncForEach(arrPO,async function (noOrden) {
		arrPartidas_id = [];
    	partidas = [];
	    await Helper.asyncForEach(noOrden.arrPartidas, async function (partida) {
	        partida.InfoPedidos[0].IDAlmacen=req.body.IdAlmacen;
	        let nPartida = new PartidaModel(partida);
	        //console.log(nPartida.InfoPedidos[0].IDAlmacen);
	        //console.log(nPartida);
	        await nPartida.save().then((partida) => {
	        	partidas.push(partida)
	            arrPartidas_id.push(partida._id);
	        });
	    });
	   //console.log(partidas);
	    //console.log(noOrden.fechasalida.toString());
	    
		let fechaSalidaPlanta=Date.parse(noOrden.fechasalida);
		let fechaesperada=Date.parse(noOrden.fechasalida)+((60 * 60 * 24 * 1000)*7+1);

		//console.log(dateFormat(fechaesperada, "dd/mm/yyyy"));
		if (partidas && partidas.length > 0) {
			let idCliente = req.body.IDClienteFiscal;
			let idSucursales = req.body.IDSucursal;

			let nEntrada = new Entrada();
			console.log(fechaesperada.toString())
			nEntrada.fechaEntrada = new Date(fechaesperada);
			nEntrada.fechaEsperada = new Date(fechaesperada);
			nEntrada.fechaReciboRemision = new Date(Date.now()-(5*3600000));
			nEntrada.valor = partidas.map(x => x.valor).reduce(function (total, valor) {
				return total + valor;
			});
			nEntrada.almacen_id=mongoose.Types.ObjectId(partidas[0].InfoPedidos[0].IDAlmacen);
			nEntrada.clienteFiscal_id = idCliente;
			nEntrada.sucursal_id = idSucursales;
			nEntrada.status = "WAITINGARRIVAL";/*repalce arrival*/
			nEntrada.tipo = "NORMAL";
			nEntrada.partidas = partidas.map(x => x._id);
			nEntrada.nombreUsuario = "BarcelBabel";
			nEntrada.tracto = noOrden.trailer;			
			nEntrada.referencia = noOrden.factura;
			nEntrada.factura = noOrden.factura;
			nEntrada.item = noOrden.factura;
			nEntrada.transportista = noOrden.transportista;
			nEntrada.operador = noOrden.chofer;
			nEntrada.sello=noOrden.sello;
			await new Promise(resolve => {
					let time=(Math.random() * 5000)*10;
			        setTimeout(resolve,time );
			        //poconsole.log(time);
			    });
			nEntrada.ordenCompra=noOrden.po;
			nEntrada.fechaAlta = new Date(Date.now()-(5*3600000));
			nEntrada.idEntrada = await getNextID();
			nEntrada.folio = await getNextID();
		 	
			nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
			
			nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
			//console.log("testEntrada");
			
			await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");

					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					
					//console.log(partidas);
					//console.log(entrada);
					console.log("/--------end----------/")
				}).catch((error) => {
					console.log(error);
					reserror=error
				});

		}else {
			console.log("No se puede, no existen partidas con los IDs de los pedidos indicados");
		}
	});
		if(reserror!= "")
		{
			console.log(reserror)
			return res.status(500).send(reserror);
		}
		else{
			//console.log("testFINAL")
			return res.status(200).send("OK");
		}
	}
	catch(error){
			console.log(error)
			return res.status(500).send(error);
			console.log(error);
	};
	console.log("ok");
	return res.status(200).send("OK");
}


/*change status to arrived*/
async function updateById(req, res) {

	let _id = req.query.id;
	let entrada = await Entrada.findOne({ _id: _id });
	entrada.status="ARRIVED";
	entrada.save().then((entrada) => {
		entrada.partidas.forEach(async id_partidas => 
        {
        	let partida = await PartidaModel.findOne({ _id: id_partidas });
        	partida.status="ARRIVED";
			partida.save();

        });
		res.status(200).send(entrada);
	})
	.catch((error) => {
		res.status(500).send(error);
	});
}


module.exports = {
    saveEntradaBabel,
    updateEntradasBabel,
    validaEntradaDuplicado,
    saveEntradaEDI,
    saveEntradaChevron,
    saveEntradaPisa,
    saveEntradaCPD,
    saveEntradaBLO,
    updateById
}