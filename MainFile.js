const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const url = 'https://gutendex.com/books?search=';

// askQuestion from class
function askQuestion(query) {
    return new Promise(resolve => {
        rl.question(query, answer => {
            resolve(answer);
        });
    });
}

// Getting book
async function getBook(str) {
    const request = await fetch(url + str);
    const json = await request.json(); // Consume promise using await so we don't get pending message
    console.log(`Found ${json.count} books.`); // printing how many books we got back

    if (json.count > 0) { //If we got any books

        const bookTitles = json.results.map((book, index) => {
            console.log(`${index + 1}. Title: ${book.title}, Author: ${book.authors.map(a => a.name).join(', ')}`);
            return book;
        });

        // what book you want
        const choice = await askQuestion(`Please enter the number of the book you'd like to select (1-${json.count}): `);
        const selectedBook = json.results[parseInt(choice) - 1]; // grab book using index

        if (selectedBook) {
            console.log(`\nYou selected: ${selectedBook.title} by ${selectedBook.authors.map(a => a.name).join(', ')}`);

            // I'm getting the text of the book
            const bookId = selectedBook.id;
            const newRequest = await fetch(`https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`);
            const newJson = await newRequest.text();
            //console.log(newJson);
            //Creating an array called pages and saving by character, we can easily make this a dictionary
            //const pages = [];
            //for (let i = 0; i < newJson.length; i += 2000) {
                //pages.push(newJson.substring(i, i + 2000));
            //}

            const pages = new Map();

            for (let i = 0; i < newJson.length; i += 2000) {
                const pageNumber = Math.floor(i / 2000) + 1; // Page number starts at 1
                const pageContent = newJson.substring(i, i + 2000);
                pages.set(pageNumber, pageContent);
            }
           // console.log(pages);


            //console.log(pages);
            let currentPage = 1;
            console.log(`\n---\nBook Preview (Page 1):\n`);
            console.log(pages.get(currentPage)); // Show the first page

            // go through pages starting at 0
            let navigating = true;
            while (navigating) {
                const action = await askQuestion("\nType 'next' for next page, 'prev' for previous page, or 'quit' to exit: ");

                if (action.toLowerCase() === 'next' && currentPage < pages.size - 1) {
                    currentPage++;
                    console.log(`\n---\nBook Preview (Page ${currentPage}):\n`);
                    console.log(pages.get(currentPage));
                } else if (action.toLowerCase() === 'prev' && currentPage > 0) {
                    currentPage--;
                    console.log(`\n---\nBook Preview (Page ${currentPage}):\n`);
                    console.log(pages.get(currentPage));
                } else if (action.toLowerCase() === 'quit') {
                    navigating = false;
                    console.log('Exiting.');
                } else {
                    console.log("Invalid input. Please type 'next', 'prev', or 'quit'.");
                }
            }
        } else {
            console.log('Invalid choice. Please try again.');
        }
    } else {
        console.log('No books found.');
    }
}

// Driver for now
async function bookSearch() {
    const searchBy = await askQuestion("Would you like to search by 'title' or 'author'? ");

    if (searchBy.toLowerCase() !== 'title' && searchBy.toLowerCase() !== 'author') {
        console.log("Invalid input, please choose either 'title' or 'author'.");
        return bookSearch(); // Ask again if the input is bad
    }

    const searchTerm = await askQuestion(`Please enter the ${searchBy} you want to search for: `);

    console.log(`Searching for books by ${searchBy}...`);
    await getBook(searchTerm);

    rl.close(); // Close the readline interface
}

bookSearch(); //Call that

//Read is driver

//booksearch
//getbook
//paging
//menu
//Create the map/dictionary globally, create map when we start, then call first method. Fuck em. Ask tomorrow. Get fucked
//Try catch when getting
//TEST