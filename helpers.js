async function getNextID(dataContext,field){
	let max = 0;
	let lastUser = await dataContext.find().sort([[field,-1]]).exec();
	max = (lastUser[0])[field] + 1;
	return max;
}

module.exports = {
	getNextID
}