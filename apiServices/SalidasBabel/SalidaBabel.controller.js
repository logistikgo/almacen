const mongoose = require('mongoose');
const Salida = require('../Salidas/Salida.model');
const Partida = require('../Partida/Partida.controller');
const PartidaModel = require('../Partida/Partida.model');
const Producto = require('../Producto/Producto.model');
const Entrada = require('../Entradas/Entrada.model');
const MovimientoInventario = require('../MovimientosInventario/MovimientoInventario.controller');
const Helper = require('../../services/utils/helpers');
const TiempoCargaDescarga = require("../TiempoCargaDescarga/TiempoCargaDescarga.controller");
const SalidaBabelModel = require('../SalidasBabel/SalidasBabel.model');
const ReenvioPedidosBitacora = require('../ReenvioPedidosBitacora/RenvioPedidosBitacora.model');
const bodyMailTemplate = require('../../services/email/templateCreator');
const mailer = require('../../services/email/mailer');

function getNextID() {
	return Helper.getNextID(Salida, "salida_id");
}

//Elimianar pedido para realizar la modificacion al mismo
async function ingresarPedidoConModificacion(pedido){

	let partidasABuscar = pedido[0].partidas;
	let pedidoAEliminar = pedido[0].referencia;

	let partidasPedido = await PartidaModel.find({_id: {$in: partidasABuscar}}).exec();
	

	await Helper.asyncForEach(partidasPedido, async function(partida){

		let referenciaPedidos = partida.referenciaPedidos.filter(pedido => pedido.referenciaPedido !== pedidoAEliminar);

		if(referenciaPedidos.length > 0){
			partida.refpedido = referenciaPedidos[0].referenciaPedido;
			partida.pedido = referenciaPedidos[0].pedido;
			partida.statusPedido = "COMPLETO";
			partida.CajasPedidas.cajas = referenciaPedidos[0].CajasPedidas.cajas;
		}else{
			partida.refpedido = "SIN_ASIGNAR";
			partida.pedido = false;
			partida.statusPedido = "SIN_ASIGNAR";
			partida.CajasPedidas.cajas = 0;
		}
		
		partida.referenciaPedidos = referenciaPedidos;
		await partida.save();
		
		console.log("Partida Liberada");
	})

	
	Salida.deleteOne({"referencia": pedidoAEliminar}, function(err){
		if(err) return handleError(err);
	   console.log("El pedido "+pedidoAEliminar+" ha sido eliminado, para remplazarlo")
	});

}

async function saveSalidaBabel(req, res) {
	console.log("----------------------------------------------------------------------start-HOLD------------------------------------------------------")
	var mongoose = require('mongoose');
	var respuestacomplete="";
	//let isEntrada = await validaEntradaDuplicado(req.body.Infoplanta[23].InfoPedido); //Valida si ya existe
	//console.log(req.body);
	var IdAlmacen= req.body.IdAlmacen;
  	var IDClienteFiscal= req.body.IDClienteFiscal;
  	var IDSucursal= req.body.IDSucursal;
	var arrPartidas=[];
	var resORDENES="";//ORDENES YA EXISTENTES
	var arrPO=[];
	var bandcompleto=true;
	let pedidoNuevo = true;
	var pedidoCompleto = true;
	
	const pedidoDetalle = Helper.createPedidoJSONForHold(req.body);
	
	try{
		console.log(req.body.Pedido.length)
		let index=0;

		let pedidoAGuardar = req.body.Pedido[1].Pedido;
		let pedidoCadena = req.body.Pedido[1].Pedido;
		let validarModificacionDePedido = new RegExp("rev");

		if(validarModificacionDePedido.test(pedidoAGuardar) && pedidoNuevo === true){
			let pedidoABuscar = pedidoAGuardar.split(" ");
			pedidoCadena = "";
			for(let i = 0; i <= 2; i++){
				pedidoCadena += pedidoABuscar[i]+" ";	
			}
			let countEntradas=await Salida.find({"referencia":pedidoCadena.trim()}).exec();

			if(countEntradas.length > 0){
				await ingresarPedidoConModificacion(countEntradas);
				pedidoNuevo = false;
			}else{
				pedidoNuevo = false;
			}
		}

		await Helper.asyncForEach(req.body.Pedido,async function (Pedido) {
			// Preparar pedido para apartar las partidas y crearlas apartir de lo solicitado
			if(Pedido.NO && index > 13 && Pedido.Clave && Pedido.Cantidad)
			{
				console.log(Pedido);
				var producto=await Producto.findOne({ 'clave':Pedido.Clave }).exec();
				if(producto==undefined)
					return res.status(404).send({statusCode: 404, response: {message: `No existe el item ${Pedido.Clave} en sistema`}});
				
				

				let countEntradas=await Salida.find({"po":pedidoAGuardar}).exec();			

				
				console.log("total: "+countEntradas.length)
		        countEntradas= countEntradas.length<1 ? await Salida.find({"referencia":req.body.Pedido[1].Pedido}).exec():countEntradas;
		        console.log("total2: "+countEntradas.length)
				if(countEntradas.length>0){
					console.log("Ya existe el pedido "+ req.body.Pedido[1].Pedido)
					return res.status(404).send({statusCode: 404, response: {message: `Ya existe el pedido ${req.body.Pedido[1].Pedido} en sistema`}});
				}
				if(arrPO.find(obj=> (obj.pedido == req.body.Pedido[1].Pedido)))
	    		{
	    			//console.log("yes");
	    			let index=arrPO.findIndex(obj=> (obj.pedido == req.body.Pedido[1].Pedido));
	    			const data={
	    				Clave:Pedido.Clave,
	    				Cantidad: parseInt(Pedido.Cantidad.toString()),
	    				equivalencia: Pedido.equivalencia
	    			};
	    			arrPO[index].arrPartidas.push(data)
		    	}
		        else
		        {
		        	const data={
	    				Clave:Pedido.Clave,
	    				Cantidad: parseInt(Pedido.Cantidad.toString()),
	    				equivalencia: Pedido.equivalencia
	    			};
		        	const PO={
		        	pedido:req.body.Pedido[1].Pedido,
					destinatario: req.body.Pedido[9].producto,
					Cliente: req.body.Pedido[4].Cliente,
					Domicilio: req.body.Pedido[5].Cliente,
		        	arrPartidas:[]
		        	}
		        	PO.arrPartidas.push(data)
	    			arrPO.push(PO);
	    			
	    		}
			}		
			index++;		
		});
		console.log(arrPO);
		
		let hoy=new Date(Date.now()-(5*3600000));

		await Helper.asyncForEach(arrPO,async function (Pedido) {
			let parRes=[];
			//console.log("----------------------------");
			//console.log(Pedido.arrPartidas.length)
			let totalpartidas =0;
			let refitem=pedidoCadena.trim();
			let refDesti=Pedido.destinatario;
			console.log(pedidoCadena);
			console.log(Pedido.arrPartidas.length);
			
			await Helper.asyncForEach(Pedido.arrPartidas,async function (par) {
				//console.log("----partida: "+par.Clave+ "----");
				let producto =await Producto.findOne({'clave': par.Clave }).exec();
				//console.log(producto.clave);
				//console.log(par.Cantidad);
				//console.log(producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia);
				let equivalencia =producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia;
				
				let needed=Math.round(par.Cantidad/equivalencia);
				let isEstiba = producto.isEstiba;
				console.log("test: "+needed);
				totalpartidas+=needed;

				
				//console.log(".0.0.0.0.0.0.0.0.");
				
				//console.log(partidas.length)/*
				
				let cantidadneeded=par.Cantidad;
				let cantidadPedida=0;
				let bandcp=true; //bandera temporal para salir del ciclo en caso de que no se encuentren partidas 
				while(cantidadneeded>0&&bandcp==true)
				{
					console.log("-------------asdasd-------------"+"clave: "+producto.clave+"equivalencia: "+equivalencia)
					//console.log(cantidadneeded);
					console.log("cantidadneeded "+cantidadneeded);
		            

		            console.log("buscar: "+cantidadPedida)
		            console.log("beforeleft: "+cantidadneeded);
		            let embalajesEntrada={cajas:cantidadPedida};
		            //let partidas=await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'isEmpty':false,/*'embalajesxSalir.cajas':{$gte: embalajesEntrada.cajas}*/fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec();
					let partidas = await PartidaModel.find({'status':'ASIGNADA', 
										origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
										'clave':par.Clave,
										'isEmpty':false,
										 'embalajesxSalir.cajas': {$nin: [0]},
										fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
									.exec();

					partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
					

					const sortPartidasWithPositionAndDaysForExpire = ((a, b) =>{
						let pasilloA = a.posiciones[0].pasillo.replace(".", "");
								let pasilloB = b.posiciones[0].pasillo.replace(".", "");
								let posicionA = (parseInt(a.posiciones[0].posicion));
								let posicionB = (parseInt(b.posiciones[0].posicion));
								let nivelA = a.posiciones[0].nivel;
								let nivelB = b.posiciones[0].nivel;
								let posicionCompletaA = pasilloA + posicionA + nivelA;
								let posicionCompletaB = pasilloB + posicionB + nivelB;

								let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);								
								let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
									
									
									if(DiasrestantesA >= DiasrestantesB && posicionCompletaA >= posicionCompletaB){
										return 1;
									}	

									if(DiasrestantesA <= DiasrestantesB && posicionCompletaA <= posicionCompletaB){
										return -1;
									}
					});

					if(cantidadneeded % equivalencia === 0){
						console.log("Completa la equivalencia");
						partidas = await PartidaModel.find({'status':'ASIGNADA', pedido: false, origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
						
						
						if(isEstiba !== true){
						
							partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

							//partidas = partidas.sort(Helper.sortPartidasByLevel);
							
						}else{
							partidas = await PartidaModel.find({'status':'ASIGNADA',origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']}, pedido: false, 'clave':par.Clave, 'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
							partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

						}
					}
					partidas = Helper.deletePartidasWithNegativeExpireDays(partidas, producto, hoy);


					partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
					

					console.log("totalpartidas: "+partidas.length)
					let count=0;
					bandcp=false;

					for (let i = 0; i < partidas.length; i++) //&& count<1
					{	
						cantidadPedida=cantidadneeded >= equivalencia ? equivalencia : cantidadneeded;
						let cantidadRestante = cantidadneeded;
						let partidaSeleccionada = partidas[i];

						if(partidas[i].embalajesxSalir.cajas === cantidadPedida * 2 && isEstiba === true && cantidadPedida === equivalencia && equivalencia !== cantidadneeded){
							cantidadPedida = equivalencia * 2;
							cantidadRestante = partidaSeleccionada.embalajesxSalir.cajas;
						}

						if(isEstiba === true && partidas[i].embalajesxSalir.cajas === (equivalencia / 2)){
							cantidadPedida = partidas[i].embalajesxSalir.cajas;
						}

						let isPartidaPickeada = false;
						let refPedidoPartida = pedidoCadena.trim();
						let refPedidoDocument = {};
						let refPedidos =[];
						//let cantidadRestante = cantidadneeded;
						let Diasrestantes; 


						if(cantidadneeded <= 0){
							break;
						}

						//console.log(i);
						//fechaFrescura = new Date(fCaducidad - (elem.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
						const DIAS_ANTICIPADOS = 0;
						//let fechaFrescura = new Date(partidas[i].fechaCaducidad.getTime() - (producto.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000)); ///se cambio por fecha de alerta amarilla
			            let fechaAlerta1 = new Date(partidas[i].fechaCaducidad.getTime() - (producto.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000*10)); 
						
						if(Helper.isPicking(equivalencia, cantidadPedida, isEstiba)){
							console.log("Completa la equivalencia");
						}else{
							console.log("Es picking")

							let partidasPick = await PartidaModel.find({'status':'ASIGNADA', 
								origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
								'clave':par.Clave,
								'isEmpty':false,
								 'embalajesxSalir.cajas': {$nin: [0]},
								fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
							.exec();

							let partidaPickeada = partidasPick.filter(partida => {
								let diasrestantes = Helper.getDaysForExpire(partida, producto, hoy);

								if(partida.fechaCaducidad.getTime() > hoy && diasrestantes >= DIAS_ANTICIPADOS){
									if(partida.embalajesxSalir.cajas !== equivalencia || partida.embalajesxSalir.cajas !== (equivalencia * 2)){
										return true;
									}else{
										return false;
									}	
								}else{
									return false;
								}	
							});
							
							if(partidaPickeada.length !== 0){
								
								const sortPartidasByDaysForExpire = (a, b) => {
									
									let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);
									
									let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
									
									let embalajesxSalirA = a.embalajesxSalir.cajas
									let embalajesxSalirB = b.embalajesxSalir.cajas;
									
									if(DiasrestantesA >= DiasrestantesB && embalajesxSalirA >= embalajesxSalirB){
										return 1;
									}	

									if(DiasrestantesA <= DiasrestantesB && embalajesxSalirA <= embalajesxSalirB){
										return -1;
									}
								};


								let partidasPickeadasOrdenadas = partidaPickeada.sort(sortPartidasByDaysForExpire)
								
								const arrayDiasRestantes = partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy));

								if(Helper.allElementAreEqualsInArray(arrayDiasRestantes) === true){
									partidasPickeadasOrdenadas = partidasPickeadasOrdenadas.sort(Helper.sortPartidasByEmbalajesxSalir);
							}
						    
							console.table({
								"partidasPickeadas": partidaPickeada.map(partida => partida.embalajesxSalir.cajas),
								"diasRestantesPartidas": partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy)),
								"partidasPickeadasOrdenadas": partidasPickeadasOrdenadas.map(partida => partida.embalajesxSalir.cajas)
							})
							isPartidaPickeada = true;
						
							//Buscar una partida pickeada y seleccionar la primera que encuentra
							const {partidaSeleccionadaPick, cantidadParcialPick} = holdPartidaPick(partidasPickeadasOrdenadas, cantidadneeded, parRes);
							cantidadPedida = cantidadParcialPick;
							cantidadRestante = cantidadPedida;
							partidaSeleccionada = partidaSeleccionadaPick;
							
						}
					}
						
						//Verificar que la partida con picking aun tenga la cantidad que le corresponde
						
							if(isPartidaPickeada && partidaSeleccionada !== undefined){
								
									console.log("Paso al pedido")
									refPedidoDocument.referenciaPedido = refPedidoPartida;
									refPedidoDocument.CajasPedidas = {cajas: cantidadPedida};
									refPedidoDocument.pedido = true;
									partidaSeleccionada.referenciaPedidos.push(refPedidoDocument);	
							}

						if(partidaSeleccionada !== undefined){
							Diasrestantes = Helper.getDaysForExpire(partidaSeleccionada, producto, hoy);
							console.log("Dias Para perder frescura"+ Diasrestantes);
							if((cantidadRestante >= cantidadPedida && partidaSeleccionada.embalajesxSalir.cajas >= cantidadPedida && partidaSeleccionada.fechaCaducidad.getTime() > hoy && Diasrestantes >= DIAS_ANTICIPADOS))
							{	
								//Prioridad buscar tarimas incompletas (Picking)
	
								console.log("Embalaje Cajas:",partidaSeleccionada.embalajesxSalir.cajas );
								let numpedido=Math.floor(partidaSeleccionada.embalajesxSalir.cajas/cantidadPedida);
									var partidaaux=await PartidaModel.findOne({_id:partidaSeleccionada._id}).exec();
									//let pedidoTotal=cantidadPedida*numpedido<=cantidadneeded ? cantidadPedida*numpedido : cantidadPedida
									
									if(partidaaux.pedido==false)
									{
										
										refPedidoDocument.referenciaPedido = refPedidoPartida;
										refPedidoDocument.CajasPedidas = {cajas: cantidadPedida}
										refPedidoDocument.pedido = true;
										refPedidos.push(refPedidoDocument);
										
										partidaaux.referenciaPedidos=refPedidos;//talves se cambie a info pedidos
										partidaaux.CajasPedidas = {cajas: cantidadPedida};
										partidaaux.pedido=true;
										partidaaux.refpedido=refPedidoPartida;	
									}
									else{
										if(isPartidaPickeada){
											partidaaux.referenciaPedidos.push(refPedidoDocument);
										}
									}

									partidaaux.CajasPedidas = partidaaux.referenciaPedidos[0].CajasPedidas;

							
									partidaaux.statusPedido="COMPLETO";
									await partidaaux.save();
									parRes.push(partidaaux);
									
										//console.log(partidaaux);
									console.log("--------------");
									count++;
									cantidadneeded-=(cantidadPedida);
									bandcp=true;
	
							}

						}else{
							console.log("Se trata de generar una salida sin partidas suficientes");
							pedidoCompleto = false;
						}

						
			        }
				}
				bandcompleto=bandcompleto==false?bandcompleto:bandcp;
			});

			console.log("********************"+totalpartidas+"=="+parRes.length+"********************");
			
			if (parRes && parRes.length) {
				//console.log(parRes);
				let entradas_id = parRes.map(x => x.entrada_id.toString()).filter(Helper.distinct);
				let entradas = await Entrada.find({ "_id": { $in: entradas_id } });

				if ((entradas && entradas.length > 0)) {
					//Obtener referencia del detalle de la slaida de babel
					pedidoDetalle.referencia.split("rev")[0].trim();
					const salidaBabelModel = new SalidaBabelModel(pedidoDetalle);
					let salidaBabel;
					let salidaBabel_id;
					salidaBabelModel.save(async function (err) {
						if (err) return handleError(err);
						// saved!
						salidaBabel = await SalidaBabelModel.find({referencia: refitem}).exec();
						salidaBabel_id = salidaBabel[0]._id.toString();
					  });


					let nSalida = new Salida();
					nSalida.salida_id = await getNextID();
					nSalida.fechaAlta = new Date(Date.now()-(5*3600000));
					nSalida.fechaSalida = new Date(Date.now()-(5*3600000));
					nSalida.nombreUsuario = "BABELSALIDA";
					nSalida.folio = await getNextID();
					//console.log(nSalida.folio);
					nSalida.partidas = parRes.map(x => x._id);
					nSalida.entrada_id = entradas_id;

					nSalida.almacen_id = IdAlmacen;
					nSalida.clienteFiscal_id = IDClienteFiscal;
					nSalida.sucursal_id = IDSucursal;
					//console.log(nSalida.clienteFiscal_id);
					nSalida.destinatario=refDesti;
					nSalida.referencia = refitem;
					nSalida.item = refitem;
					nSalida.tipo = "FORSHIPPING";//NORMAL
					//console.log(nSalida);
					nSalida.statusPedido="COMPLETO";
					nSalida.salidaBabel_id = salidaBabel_id
					nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O', false);
					console.log("******************************************--------------------**********************")
					console.log(nSalida);
					console.log("******************************************--------------------**********************")
					
					if( bandcompleto ==false){
						await Helper.asyncForEach(parRes,async function (par) {

							nSalida.statusPedido="INCOMPLETO";
							var partidaaux=await PartidaModel.findOne({_id:par._id}).exec();
			            	nSalida.statusPedido="INCOMPLETO";
			            	respuestacomplete="INCOMPLETO";
			            	await partidaaux.save();
						})
					}
					//saveSalida
					
					

					nSalida.save(); //salida guarda 
				} else {
					return res.status(400).send("Se trata de generar una salida sin entrada o esta vacia");
				}
				
			} else {
				console.log("Se trata de generar una salida sin partidas suficientes");
				//Enviar correo a sistemas, Barcel, Inventarios

				mailer.sendEmail({body: `Se ha intentado 
										generar una salida sin 
										partidas suficientes
										para el pedido: ${refitem}`})
										.then(response =>{
											console.log("Se ha enviado el mensaje con exito");
										});

				return res.status(400).send({statusCode: 400, body: "Se trata de generar una salida sin partidas suficientes en el pedido "+ refitem});
				//return res.status(400).send("Se trata de generar una salida sin partidas suficientes");
			}
			console.log(parRes)
		});
	}catch(error){
			console.log(error);
			res.status(500).send(error);
			console.log(error);
	};

	return res.status(200).send({statusCode: 200, response: {message: `Se ha dado de alta el pedido en sistema`}});
}

async function removefromSalidaId(req, res) {

	let _id = req.body.Salida_id;
	let partida_id = req.body.partida_id;
	let salida= await Salida.findOne({ _id: _id }).exec();
	let referenciaPedido = salida.referencia;
	if(salida){
		let indexpartida= salida.partidas.findIndex(obj=> (obj.toString() == partida_id)); 
		console.log(indexpartida)
		salida.partidas.splice(indexpartida, 1);
		  
	//	console.log(data);
		var partidaaux= await PartidaModel.findOne({_id:partida_id}).exec();
		let referenciaActual = partidaaux.refpedido;
		//let salida = await Salida.find({partidas: {$in: [partidaaux._id]}});
		
		let referenciaPedidos = partidaaux.referenciaPedidos.filter(pedido => pedido.referenciaPedido !== referenciaPedido);

		let pedidos = referenciaPedidos.map(pedido => pedido.pedido);
		let allElementsAreEquals = false;
		
		for(let i = 0; i < pedidos.length; i++){
			if(pedidos[i] === false){
				break;
			}
			else{
				allElementsAreEquals = true;
			}
		}
		
		if(allElementsAreEquals === true || referenciaPedidos.length === 0){
			partidaaux.CajasPedidas={cajas:0};
			partidaaux.pedido=false;
			partidaaux.refpedido="SIN_ASIGNAR";
			partidaaux.statusPedido="SIN_ASIGNAR";
		}
		//Asignar el pedido actual, si el pedido corresponde con la referencia original
		if(referenciaActual === referenciaPedido && referenciaPedidos.length > 1){
			let referenciaPedidoARemplazar = referenciaPedidos.filter(pedido => pedido.pedido === true);
			partidaaux.refpedido = referenciaPedidoARemplazar[0].referenciaPedido;
			partidaaux.CajasPedidas={cajas:referenciaPedidoARemplazar[0].CajasPedidas.cajas};
		}else{
			partidaaux.referenciaPedidos.pop();
		}       

		partidaaux.referenciaPedidos = referenciaPedidos;
		partidaaux.save();
		 salida.save().then(async(data) => {

			res.status(200).send(data);
			
		})
		.catch((error) => {
			console.log(error);
			res.status(500).send(error);
		}); 
		
	}
}

async function agregarPartidaSalidaId(req, res) {
	let _id = req.body.Salida_id;
	let partidas_id = req.body.partidas_id;
	let embalajes = req.body.embalajes;
	let isPicking = req.body.isPicking !== undefined ? req.body.isPicking : false;

	//console.log(_id);
	try{
		let salida= await Salida.findOne({ _id: _id }).exec();
		

		if(isPicking === false){
			await Helper.asyncForEach(partidas_id, async function(partida){
				await agregarPartidaASalidaId(_id, partida, embalajes);
			})
		}else{
			await agregarPartidaASalidaId(_id, partidas_id, req.body.embalajes, isPicking);
		}

		salida.save().then(async (data) => {

			res.status(200).send(data);
		}) 
		 .catch((error) => {
			console.log(error);
			res.status(500).send(error);
		});
	}catch(error){
			console.log(error);
			res.status(500).send(error);
			console.log(error);
	};
}

async function agregarPartidaSalidaId(req, res) {
	let _id = req.body.Salida_id;
	let partidas_id = req.body.partidas_id;
	let embalajes = req.body.embalajes;
	let isPicking = req.body.isPicking !== undefined ? req.body.isPicking : false;

	//console.log(_id);
	try{
		let salida= await Salida.findOne({ _id: _id }).exec();
		

		if(isPicking === false){
			await Helper.asyncForEach(partidas_id, async function(partida){
				await agregarPartidaASalidaId(_id, partida, embalajes);
			})
		}else{
			await agregarPartidaASalidaId(_id, partidas_id, req.body.embalajes, isPicking);
		}

		salida.save().then(async (data) => {

			res.status(200).send(data);
		}) 
		 .catch((error) => {
			console.log(error);
			res.status(500).send(error);
		});
	}catch(error){
			console.log(error);
			res.status(500).send(error);
			console.log(error);
	};
}


async function agregarPartidaASalidaId(salida_id, partida_id, embalajes, isPicking = false){


	try{

		let salida= await Salida.findOne({ _id: salida_id }).exec();
		let referenciaPedido = salida.referencia;
		let partidaaux=await PartidaModel.findOne({_id:partida_id}).exec();
		let cajas = embalajes;
		let embalajesCajas = partidaaux.embalajesxSalir.cajas;

		salida.partidas.push(partidaaux._id);
		if(salida.entrada_id.find(x => x == partidaaux.entrada_id) == undefined)
			salida.entrada_id.push(partidaaux.entrada_id)
			let pedidoHold = {
				"referenciaPedido": referenciaPedido,
				"pedido": true,
				"CajasPedidas": {
					
				}
			}

			if(isPicking === false){
				pedidoHold["CajasPedidas"][embalajes] = embalajesCajas;
				partidaaux.CajasPedidas={cajas:parseInt(embalajesCajas)};
			}else{
				pedidoHold["CajasPedidas"].cajas = embalajes;
				partidaaux.CajasPedidas={cajas:parseInt(embalajes)};
			}

			if(partidaaux.referenciaPedidos.length > 0 && isPicking === false){
				let referencia_pedido_a_cambiar = partidaaux.referenciaPedidos[0].referenciaPedido;
				let salida_referencia = await Salida.findOne({referencia:  referencia_pedido_a_cambiar}).exec();
				
				if(salida_referencia){
					
					let indexpartida= salida_referencia.partidas.findIndex(obj=> (obj.toString() == partida_id)); 
					console.log(indexpartida)
					salida_referencia.partidas.splice(indexpartida, 1);
					partidaaux.referenciaPedidos.pop();
					await salida_referencia.save();
				}

			}

			partidaaux.referenciaPedidos.push(pedidoHold);
	    	partidaaux.pedido=true;
	    	partidaaux.refpedido=salida.referencia;
			partidaaux.statusPedido=salida.statusPedido;
			partidaaux.save();

			const saveSalida = await salida.save();

			return saveSalida;

	}catch(error){
		console.log(error);
	}


}

async function saveSalidasEnEntrada(entrada_id, salida_id) {
	let entradas = await Entrada.find({ _id: { $in: entrada_id } }).exec();
	//console.log("ENTRADAS ENCONTRADAS DEL ARREGLO");
	//console.log(entrada_id);
	Helper.asyncForEach(entradas, async function (entrada) {
		entrada.salidas_id.push(salida_id);
		let jEdit = {
			salidas_id: entrada.salidas_id
		};
	//	console.log(jEdit);
		await Entrada.updateOne({ _id: entrada._id }, { $set: jEdit }).exec();
	});
}


async function saveDashboard(req, res) {
	try{
	let nSalida = await Salida.findOne({ _id: req.body.id }).exec();
	
	//nSalida.fechaSalida = new Date(req.body.fechaSalida);
	nSalida.usuarioAlta_id= req.body.usuarioAlta_id;
    nSalida.nombreUsuario= req.body.nombreUsuario;
    nSalida.recibio= req.body.recibio;
	nSalida.tipo="NORMAL"
	nSalida.fechaAlta = new Date(Date.now()-(5*3600000));
	let refpedido=nSalida.referencia;
	await nSalida.save().then(async (salida) => {
			for (let itemPartida of req.body.jsonPartidas) {
				await MovimientoInventario.saveSalida(itemPartida, salida.id);
			}

			TiempoCargaDescarga.setStatus(salida.tiempoCarga_id, { salida_id: salida._id, status: "ASIGNADO" });

			let partidas = await Partida.put(req.body.jsonPartidas, salida._id);
			salida.partidas = partidas;

			await saveSalidasEnEntrada(salida.entrada_id, salida._id);
			await Salida.updateOne({ _id: salida._id }, { $set: { partidas: partidas } }).then(async(updated) => {
				let parRes = await PartidaModel.find({'status':'ASIGNADA', 'pedido':true,'referenciaPedidos.referenciaPedido':{$regex: refpedido}}).exec(); 
				await Helper.asyncForEach(parRes,async function (par) {
					
					let referenciaPedidos = par.referenciaPedidos;

					for(let i = 0; i < referenciaPedidos.length; i++){
						if(referenciaPedidos[i].referenciaPedido === refpedido){
							referenciaPedidos[i].pedido = false;
							break;
						}
					}
					let pedidos = referenciaPedidos.map(pedido => pedido.pedido);
					let allElementsAreEquals = false;
					
					for(let i = 0; i < pedidos.length; i++){
						if(pedidos[i].pedido === false){
							break;
						}
						else{
							allElementsAreEquals = true;
						}
					}
					
					if(allElementsAreEquals === true){
						par.pedido=false;
						par.refpedido = "SIN_ASIGNAR",
						par.statusPedido = "SIN_ASIGNAR";
						par.CajasPedidas.cajas = 0;
					}

					par.save(function (err) {
						if (err) return handleError(err);
						// saved!
						console.log("La partida ha sido editada correctamente ", par)
					  });

				})
				res.status(200).send(salida);

			});
		})
		.catch((error) => {
			console.log(error)
			res.status(500).send(error);
		});
	}catch(error){
			console.log(error);
			res.status(500).send(error);
			console.log(error);
	};
	console.log("error");
}

async function reloadPedidosBabel(req, res){

	let salidasActuales;

	const referencia = req.query?.referencia ? req.query.referencia : null;

	if(referencia !== null){
		salidasActuales = await Salida.find({"referencia": referencia, tipo: "FORSHIPPING" }).exec();
	}else{
		salidasActuales = await Salida.find({tipo: "FORSHIPPING" }).sort({fechaAlta: 1}).exec();
	}

	if(salidasActuales.length === 0){
		return res.status(404).send({status: 404, response: {message: `La referencia ${referencia} no existe en sistema`}});
	}

	
	let referencias = [];
	let detallePedidoTeplate = "";
	let detallesPedidosArray = [];
	await Helper.asyncForEach(salidasActuales, async function(salidaActual){
			
			detallePedidoTeplate = "";
			let salidaAReenviar = await eliminarPedidoParaRenviar(salidaActual.referencia);
	
			referencias.push(salidaActual.referencia);
	
			let salidaBabel = await SalidaBabelModel.findById({_id: salidaAReenviar[0].salidaBabel_id}).exec();

			salidaBabel.productosDetalle.forEach(productoDetalle => {

				const {No, producto, Clave, Cantidad} = productoDetalle;
				
				detallePedidoTeplate += `<tr>
												<td>${No}</td>
												<td>${Clave}</td>
												<td>${producto}</td>
												<td>${Cantidad}</td>
												<td>${salidaActual.referencia}</td>
											</tr>
				`

			})
			
			detallesPedidosArray.push({
				template: detallePedidoTeplate,
				pedido: salidaActual.referencia
			});

			let {partidas_id, entradas_id} = await reasignarPartidasDisponiblesEnPedidos(salidaBabel);
	
			salidaActual.partidas = partidas_id.map(partida => partida._id);
			partidas_id = partidas_id.map(partida => partida._id);
			
			await Salida.updateOne({_id: salidaActual._id}, 
									{ $set: { partidas: partidas_id, 
											entrada_id: entradas_id,
											tipo: "FORSHIPPING" } });
			
			const reenvioPedidosBitacoraJson = {
				sucursal_id: salidaActual.sucursal_id,
				almacen_id: salidaActual.almacen_id,
				clienteFiscal_id: salidaActual.clienteFiscal_id,
				salida_id: salidaActual._id,
				descripcion: "Se ha reenviado el pedido con exito",
				tipo: "SALIDA",
				nombreUsuario: "BABEL",
				status: "ACTIVO",
			}
	
			const reenvioPedidosBitacora = new ReenvioPedidosBitacora(reenvioPedidosBitacoraJson);
	
			await reenvioPedidosBitacora.save()								

	})


	//Crear bitacora para controlar las veces que se resuben los pedidos
	//adicional a eso, crear funcionalidad para enviar un correo para verificar que se subio el pedido	
	let detallesPedidosTemplates = generateTablePedidosTempate(detallesPedidosArray);

	let bodyHtmlMail = bodyMailTemplate.bodyHtml(detallesPedidosTemplates);
	
	mailer.sendEmail({body: bodyHtmlMail}, "[LGKGO] Notificacion Reenvio Pedidos")
	.then(response =>{
		console.log("Se ha enviado el mensaje con exito");
	});
	res.status(200).send({"statusCode": 200, "response": "Se han resubido los pedidos"});

}

//`<h4>Pedido: ${pedido}</h4>
function generateTablePedidosTempate(detallesPedidosArray) {
	let detallePedidoTemplates = "";
	detallesPedidosArray.forEach(detallePedido => {
		const {template, pedido } = detallePedido
		detallePedidoTemplates += 
		
		`<table>
			<th>Numero</th>
			<th>Item</th>
			<th style="width: 70%;">Descripcion</th>
			<th>Cantidad</th>
			<th>Pedido</th>
			${template}
		</table>`;		
	})
	return detallePedidoTemplates

}


//Elimianar pedido para realizar la modificacion al mismo
async function eliminarPedidoParaRenviar(referencia){

	
	let salida = await Salida.find({"referencia": referencia, tipo: "FORSHIPPING"}).exec();

	const partidas_id = salida[0].partidas;
	let partidasPedido;
	
	if(partidas_id.length !== 0){
		partidasPedido = await PartidaModel.find({_id: {$in: partidas_id}}).exec()
	}else{
		partidasPedido = await PartidaModel.find({"referenciaPedidos.referenciaPedido": referencia,
												"referenciaPedidos.pedido": true,
												pedido: true }).exec();
	}

	await Helper.asyncForEach(partidasPedido, async function(partida){

		const partidaSinPedido = desasiganarPedidoEnPartida(partida, referencia);

		console.log(partidaSinPedido);

		await partidaSinPedido.save();

	})

	salida[0].partidas = [];
	salida[0].entrada_id = [];

	await salida[0].save();

	return salida;


}


async function reasignarPartidasDisponiblesEnPedidos(salidaBabel){

	let totalpartidas =0;
	let refitem=salidaBabel.referencia.trim();
	
	let hoy=new Date(Date.now()-(5*3600000));
	let parRes=[];
	var pedidoCompleto = true;
	var bandcompleto=true;
	let pedidoNuevo = true;
	var pedidoCompleto = true;

	await Helper.asyncForEach(salidaBabel.productosDetalle,async function (par) {
		//console.log("----partida: "+par.Clave+ "----");
		let producto =await Producto.findOne({'clave': par.Clave }).exec();
		//console.log(producto.clave);
		//console.log(par.Cantidad);
		//console.log(producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia);
		let equivalencia =producto.arrEquivalencias.length>=1 ? parseInt(producto.arrEquivalencias[0].cantidadEquivalencia): par.equivalencia;
		
		let needed=Math.round(par.Cantidad/equivalencia);
		let isEstiba = producto.isEstiba;
		console.log("test: "+needed);
		totalpartidas+=needed;

		
		//console.log(".0.0.0.0.0.0.0.0.");
		
		//console.log(partidas.length)/*
		
		let cantidadneeded= parseInt(par.Cantidad);
		let cantidadPedida=0;
		let bandcp=true; //bandera temporal para salir del ciclo en caso de que no se encuentren partidas 
		while(cantidadneeded>0&&bandcp==true)
		{
			console.log("-------------asdasd-------------"+"clave: "+producto.clave+"equivalencia: "+equivalencia)
			//console.log(cantidadneeded);
			console.log("cantidadneeded "+cantidadneeded);
			

			console.log("buscar: "+cantidadPedida)
			console.log("beforeleft: "+cantidadneeded);
			let embalajesEntrada={cajas:cantidadPedida};
			//let partidas=await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'isEmpty':false,/*'embalajesxSalir.cajas':{$gte: embalajesEntrada.cajas}*/fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec();
			let partidas = await PartidaModel.find({'status':'ASIGNADA', 
								origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
								'clave':par.Clave,
								'isEmpty':false,
								pedido: false,
								 'embalajesxSalir.cajas': {$nin: [0]},
								fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
							.exec();

			partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
			

			const sortPartidasWithPositionAndDaysForExpire = ((a, b) =>{
				let pasilloA = a.posiciones[0].pasillo.replace(".", "");
						let pasilloB = b.posiciones[0].pasillo.replace(".", "");
						let posicionA = (parseInt(a.posiciones[0].posicion));
						let posicionB = (parseInt(b.posiciones[0].posicion));
						let nivelA = a.posiciones[0].nivel;
						let nivelB = b.posiciones[0].nivel;
						let posicionCompletaA = pasilloA + posicionA + nivelA;
						let posicionCompletaB = pasilloB + posicionB + nivelB;

						let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);								
						let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
							
							
							if(DiasrestantesA >= DiasrestantesB && posicionCompletaA >= posicionCompletaB){
								return 1;
							}	

							if(DiasrestantesA <= DiasrestantesB && posicionCompletaA <= posicionCompletaB){
								return -1;
							}
			});

			if(cantidadneeded % equivalencia === 0){
				console.log("Completa la equivalencia");
				partidas = await PartidaModel.find({'status':'ASIGNADA', pedido: false, origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
				
				
				if(isEstiba !== true){
				
					partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

					//partidas = partidas.sort(Helper.sortPartidasByLevel);
					
				}else{
					partidas = await PartidaModel.find({'status':'ASIGNADA',origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']}, pedido: false, 'clave':par.Clave, 'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1}).exec();
					partidas = partidas.sort(sortPartidasWithPositionAndDaysForExpire);

				}
			}
			partidas = Helper.deletePartidasWithNegativeExpireDays(partidas, producto, hoy);

			partidas=partidas.length<1 ? await PartidaModel.find({'status':'ASIGNADA', origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,'clave':par.Clave,'embalajesxSalir.cajas': {$nin: [0]},'isEmpty':false,fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).exec() : partidas;
			

			console.log("totalpartidas: "+partidas.length)
			let count=0;
			bandcp=false;
			for (let i = 0; i < partidas.length; i++) //&& count<1
			{	
				cantidadPedida=cantidadneeded >= equivalencia ? equivalencia : cantidadneeded;
				let cantidadRestante = cantidadneeded;
				let partidaSeleccionada = partidas[i];

				if(partidas[i].embalajesxSalir.cajas === cantidadPedida * 2 && isEstiba === true && cantidadPedida === equivalencia && equivalencia !== cantidadneeded){
					cantidadPedida = equivalencia * 2;
					cantidadRestante = partidaSeleccionada.embalajesxSalir.cajas;
				}

				if(isEstiba === true && partidas[i].embalajesxSalir.cajas === (equivalencia / 2)){
					cantidadPedida = partidas[i].embalajesxSalir.cajas;
				}

				if(cantidadneeded < cantidadRestante){
					cantidadPedida = cantidadneeded;
				}
				
				let isPartidaPickeada = false;
				let refPedidoPartida = refitem.trim();
				let refPedidoDocument = {};
				let refPedidos =[];
				//let cantidadRestante = cantidadneeded;
				let Diasrestantes; 


				if(cantidadneeded <= 0){
					break;
				}

				//let referenciaPedidos = partidaSeleccionada.referenciaPedidos.map(ref => ref.CajasPedidas.cajas);
				//let cantidadApartada = referenciaPedidos.reduce((val, acc) => val += acc);



				//console.log(i);
				//fechaFrescura = new Date(fCaducidad - (elem.producto_id.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000));
				const DIAS_ANTICIPADOS = 0;
				//let fechaFrescura = new Date(partidas[i].fechaCaducidad.getTime() - (producto.garantiaFrescura * 86400000)- (60 * 60 * 24 * 1000)); ///se cambio por fecha de alerta amarilla
				//let fechaAlerta1 = new Date(partidas[i].fechaCaducidad.getTime() - (producto.alertaAmarilla * 86400000)- (60 * 60 * 24 * 1000*10)); 
				
				if(Helper.isPicking(equivalencia, cantidadPedida, isEstiba)){
					console.log("Completa la equivalencia");
				}else{
					console.log("Es picking")

					let partidasPick = await PartidaModel.find({'status':'ASIGNADA', 
								origen:{$nin:['ALM-SIERRA','BABEL-SIERRA']} ,
								'clave':par.Clave,
								'isEmpty':false,
								 'embalajesxSalir.cajas': {$nin: [0]},
								fechaCaducidad:{$gt:hoy}}).sort({ fechaCaducidad: 1 }).sort({"posiciones.nivel": -1, "posiciones.pasillo": 1})
							.exec();
						partidasPick = Helper.deletePartidasWithNegativeExpireDays(partidasPick, producto, hoy);

					let partidaPickeada = partidasPick.filter(partida => {
						let diasrestantes = Helper.getDaysForExpire(partida, producto, hoy);

						if(partida.fechaCaducidad.getTime() > hoy && diasrestantes >= DIAS_ANTICIPADOS){
							if(partida.embalajesxSalir.cajas !== equivalencia || partida.embalajesxSalir.cajas !== (equivalencia * 2)){
								return true;
							}else{
								return false;
							}	
						}else{
							return false;
						}	
					});
					
					if(partidaPickeada.length !== 0){
						
						const sortPartidasByDaysForExpire = (a, b) => {
							
							let DiasrestantesA = Helper.getDaysForExpire(a, producto, hoy);
							
							let DiasrestantesB = Helper.getDaysForExpire(b, producto, hoy);
							
							let embalajesxSalirA = a.embalajesxSalir.cajas
							let embalajesxSalirB = b.embalajesxSalir.cajas;
							
							if(DiasrestantesA >= DiasrestantesB && embalajesxSalirA >= embalajesxSalirB){
								return 1;
							}	

							if(DiasrestantesA <= DiasrestantesB && embalajesxSalirA <= embalajesxSalirB){
								return -1;
							}
						};


						let partidasPickeadasOrdenadas = partidaPickeada.sort(sortPartidasByDaysForExpire)
						
						const arrayDiasRestantes = partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy));

						if(Helper.allElementAreEqualsInArray(arrayDiasRestantes) === true){
							partidasPickeadasOrdenadas = partidasPickeadasOrdenadas.sort(Helper.sortPartidasByEmbalajesxSalir);
					}
					
					console.table({
						"partidasPickeadas": partidaPickeada.map(partida => partida.embalajesxSalir.cajas),
						"diasRestantesPartidas": partidasPickeadasOrdenadas.map(partida => Helper.getDaysForExpire(partida, producto, hoy)),
						"partidasPickeadasOrdenadas": partidasPickeadasOrdenadas.map(partida => partida.embalajesxSalir.cajas)
					})
					isPartidaPickeada = true;
				
					//Buscar una partida pickeada y seleccionar la primera que encuentra
					const {partidaSeleccionadaPick, cantidadParcialPick} = holdPartidaPick(partidasPickeadasOrdenadas, cantidadneeded, parRes);
					cantidadPedida = cantidadParcialPick;
					cantidadRestante = cantidadPedida;
					partidaSeleccionada = partidaSeleccionadaPick;
					
				}
			}
				
				//Verificar que la partida con picking aun tenga la cantidad que le corresponde
				
					if(isPartidaPickeada && partidaSeleccionada !== undefined){
						
							console.log("Paso al pedido")
								
					}

				if(partidaSeleccionada !== undefined){
					Diasrestantes = Helper.getDaysForExpire(partidaSeleccionada, producto, hoy);
					console.log("Dias Para perder frescura"+ Diasrestantes);
					if(cantidadRestante >= cantidadPedida && partidaSeleccionada.embalajesxSalir.cajas >= cantidadPedida && partidaSeleccionada.fechaCaducidad.getTime() > hoy && Diasrestantes >= DIAS_ANTICIPADOS)
					{	
						//Prioridad buscar tarimas incompletas (Picking)

						console.log("Embalaje Cajas:",partidaSeleccionada.embalajesxSalir.cajas );
						let numpedido=Math.floor(partidaSeleccionada.embalajesxSalir.cajas/cantidadPedida);
							var partidaaux=await PartidaModel.findOne({_id:partidaSeleccionada._id}).exec();
							//let pedidoTotal=cantidadPedida*numpedido<=cantidadneeded ? cantidadPedida*numpedido : cantidadPedida
							
						
							const referenciaPedidoDocument = crearReferenciaPedido(refPedidoPartida, cantidadPedida);
							//partidaSeleccionada.referenciaPedidos.push(refPedidoDocument);

							if(partidaaux.pedido==false && partidaaux.referenciaPedidos.length === 0)
							{
								refPedidos.push(referenciaPedidoDocument);
								
								partidaaux.referenciaPedidos=refPedidos;//talves se cambie a info pedidos
								partidaaux.CajasPedidas = {cajas: cantidadPedida};
								partidaaux.pedido=true;
								partidaaux.refpedido=refPedidoPartida;	
							}
							else{
									partidaaux.referenciaPedidos.push(referenciaPedidoDocument);
							}
							
							partidaaux.CajasPedidas = partidaaux.referenciaPedidos[0].CajasPedidas;

							partidaaux.statusPedido="COMPLETO";
							await partidaaux.save();
							parRes.push(partidaaux);
							
								//console.log(partidaaux);
							console.log("--------------");
							count++;
							cantidadneeded-=(cantidadPedida);
							bandcp=true;

					}

				}else{
					console.log("Se trata de generar una salida sin partidas suficientes");
					pedidoCompleto = false;
				}

				
			}
		}
		bandcompleto=bandcompleto==false?bandcompleto:bandcp;
	});

	let entradas_id = parRes.map(x => x.entrada_id.toString()).filter(Helper.distinct);

	return {"partidas_id":parRes, "entradas_id": entradas_id};

	//console.log("********************"+totalpartidas+"=="+parRes.length+"********************");


}

function crearReferenciaPedido(referenciaPedidoPartida, cantidadPedida){

	return {
		"referenciaPedido": referenciaPedidoPartida,
		"CajasPedidas": { cajas: cantidadPedida },
		"pedido": true
	}

}


function desasiganarPedidoEnPartida(partida, referencia){


	let referenciaPedidos = partida.referenciaPedidos.filter(pedido => pedido.referenciaPedido !== referencia);


		if(referenciaPedidos.length > 0){
			partida.refpedido = referenciaPedidos[0].referenciaPedido;
			partida.pedido = referenciaPedidos[0].pedido;
			partida.statusPedido = "COMPLETO";
			partida.CajasPedidas.cajas = referenciaPedidos[0].CajasPedidas.cajas;
		}else{
			partida.refpedido = "SIN_ASIGNAR";
			partida.pedido = false;
			partida.statusPedido = "SIN_ASIGNAR";
			partida.CajasPedidas.cajas = 0;
		}

		partida.referenciaPedidos = referenciaPedidos;

		return partida;
}

function holdPartidaPick(partidasOrdenadas, cantidadPedida, partidasParciales){

	let cantidadRestante;
	let isPartidaHold = false;
	let partidaSeleccionadaPick;
	let cantidadParcialPick = cantidadPedida;
	let cantidadApartada;
	let i = 0;
	let partidasParcialesCopy = partidasParciales.slice();

	
	while(isPartidaHold === false && i < partidasOrdenadas.length){
		cantidadRestante = partidasOrdenadas[i].embalajesxSalir.cajas;
			
			let index = partidasParcialesCopy.findIndex(partida => partida._id.toString() === partidasOrdenadas[i]._id.toString());

			if(index !== -1){
				let indexParcial = partidasOrdenadas.findIndex(partida => partida._id.toString() === partidasParcialesCopy[index]._id.toString());
				partidasOrdenadas.splice(indexParcial, 1);
				partidasOrdenadas.splice(indexParcial, 0, partidasParcialesCopy[index]);
				partidasParcialesCopy.splice(index, 1);
			}
			if(partidasOrdenadas[i].referenciaPedidos.length >= 1){
			let cantidadCajasPedidasArray = partidasOrdenadas[i].referenciaPedidos.filter(pedido => pedido.pedido === true).map(partida => partida.CajasPedidas.cajas);
			if(cantidadCajasPedidasArray.length > 0){
				cantidadApartada = cantidadCajasPedidasArray.reduce((val, acc) => val += acc);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
				cantidadRestante = (partidasOrdenadas[i].embalajesxSalir.cajas - cantidadApartada);
			}
			
			console.log("Cantidad de cajas Pedidas", cantidadCajasPedidasArray);
			console.log("Cantidad de cajas apartadas", cantidadApartada);
		}
		
		console.log("Cantidad restantes", cantidadRestante);
		
		if(cantidadRestante >= cantidadPedida && cantidadRestante !== 0){
			isPartidaHold = true;
			partidaSeleccionadaPick = partidasOrdenadas[i];
			i = partidasOrdenadas.length;

		}else{

			if(cantidadRestante !== 0){

				isPartidaHold = true;
				cantidadParcialPick = cantidadRestante; 
				partidaSeleccionadaPick = partidasOrdenadas[i];
				i = partidasOrdenadas.length;
			}
		}
		i++;
	}

	return {partidaSeleccionadaPick, cantidadParcialPick};
}



module.exports = {
    saveSalidaBabel,
    removefromSalidaId,
    agregarPartidaSalidaId,
    saveDashboard,
    reloadPedidosBabel
}
