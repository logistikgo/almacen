async function getNextID(dataContext,field){
	let max = 0;
	let lastUser = await dataContext.find().sort([[field,-1]]).exec();
	
	if(lastUser[0]!=null)
		max = (lastUser[0])[field];

	return max + 1;
}

module.exports = {
	getNextID
}