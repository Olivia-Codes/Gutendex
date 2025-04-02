
const url ='https://gutendex.com/books?search=';
//const urlID = `https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`
async function getData(str){

    //Bodies with all the headers We just wanna know comm done
    //We wanna pull out json data

    const request = await fetch(url + str);
    const json =await request.json();//Consume promise using await
    console.log(json) //Between 0 and 32 objects(books)

    //Count has how many objects being returned.
    //results is the key and the value is an array that holds 21 objects.
    // json.formats
    //https://www.gutenberg.org/ebooks/1661.txt.utf-8
    for(let i = 0; i<json.count; ++i){

        console.log(json.results[i].title);
    }
    bookId = json.results[0].id;
    const Newrequest = await fetch(`https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`);
    const Newjson= await Newrequest.text();
    console.log(Newjson)

}
//function askQuestion(query){
//	return new Promise(resolve => {
//		rl.question(query, answer => {
//			resolve(answer);
//		});
//	});
//}

//async function getBook(){
//	const answer = await askQuestion("Give me an author or book title you want! ");


getData("Adventures of Sherlock Holmes: Illustrated")