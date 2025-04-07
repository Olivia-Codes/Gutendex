const readline = require('readline'); // readline gives an interface to get input from a stream
const fs = require('fs'); // importing file system so we can save last 10 locally
const path = require('path'); // importing path so I can join later

const rl = readline.createInterface({
    input: process.stdin,  // having interface use standard input stream for user input
    output: process.stdout // sending output to console
});

const url = 'https://gutendex.com/books?search=';

const locallySaved = '/Users/oliviafoster/Gutendex/Last10Books/last10.json'; // Olivia's Local Dir Path
//const locallySaved = '/Users/nstra/WebstormProjects/Gutendex/Last10Books/booksQueue.json'; //Noah's Local Dir Path
let last10 = [];

if (fs.existsSync(locallySaved)) { // Stops code until check is complete to check if this path exists
    const file = fs.readFileSync(locallySaved);  // Stops code until file is read, saves
    last10 = JSON.parse(file);  // Turning json format into javascript object
}

// From class
function askQuestion(query) {
    return new Promise(resolve => {
        rl.question(query, answer => {
            resolve(answer);
        });
    });
}

// Save the booksQueue to the file, so we don’t lose all our precious books
function downloadBook() {
    if (!fs.existsSync(path.join(__dirname, 'Last10Books'))) { // if path doesn't exist
        fs.mkdirSync(path.join(__dirname, 'Last10Books'));  // Make it
    }

    // Creating a dictionary that is book title and pages to download + retrieve locally
    const bookToDownload = last10.map(book => ({
        title: book.title,
        pages: book.pages
    }));

    fs.writeFileSync(locallySaved, JSON.stringify(bookToDownload, null, 2), 'utf-8'); // Writing to local
}

/// Mostly for testing
function clearQueue() {
    last10 = []; // Empty it
    downloadBook(); // save empty
    console.log('Book shelf is now empty.'); // saying we did it
}

function updateBookShelf(title, pages) {
    //Geeksforgeeks and ChatGPT helped me understand/write arrow function here -Olivia
    const bookIndex = last10.findIndex(book => book.title === title);  // finding index of passed book using its title
    //Also this is an arrow function. so bookIndex is function name, it calls function findIndex on
    //last10 and book is the parameter, book.title === title is the condition that has to be true. It's a callback function
    //Checking if passed book title matches any existing book titles in last10

    if (bookIndex !== -1) {
        // if it's -1, we never found it. So if we get here, we found it!
        last10.unshift(last10.splice(bookIndex, 1)[0]);
        //splice(index we wanna move, number of element we're removing) - This will then
        //return this removed thing as array. unshift adds stuff to the front of an array.
        //the [0] grabs the first and only thing returned from splice(bookIndex,1) and unshift then
        //takes this book and places it at the front.
    } else {
        // Means we didn't find it. so we just place it at the front.
        last10.unshift({ title, pages });

        if (last10.length > 10) {
            last10.pop();  // Only saving 10 books
        }
    }

    // Now that we have made our updates, we re-write
    downloadBook();
}

function printDownloadedBooks() {
    if (last10.length === 0) { // We have no books right now
        console.log("Book shelf empty :(");
        return;
    }

    console.log("\nDownloaded Books:");
    last10.forEach((book, index) => { // Loop through map, kinda like .items()
        console.log(`${index + 1}. Title: ${book.title}`); // Listing out downloaded books for selection
        // adding 1 to index because we start at 0
    });
}

async function getBook(str) {
    const request = await fetch(url + str); // Get the book data from Gutendex
    const json = await request.json();
    console.log(`We have ${json.count} options.`);

    if (json.count > 0) { // If any books located
        const bookTitles = json.results.map((book, index) => { // Map is iterating over every book
            // and saving the books + indexes.
            console.log(`${index + 1}. Title: ${book.title}, Author: ${book.authors.map(author => author.name).join(', ')}`);
            // map for authors is iterating over authors' names and joining them with a comma
            return book;
        });

        const choice = await askQuestion(`Enter the number of the book you'd like to read (1-${json.count}): `);
        const selectedBook = json.results[parseInt(choice) - 1]; // casts user string into int and subtracts 1, because we start at 0

        if (selectedBook) { // Truthy is not zero, not empty string, and object or a function. Else false
            console.log(`\nYou want to read: ${selectedBook.title} by ${selectedBook.authors.map(author => author.name).join(', ')}`);

            const bookId = selectedBook.id; // grab id
            let newJson = ''; // actually gonna be text
            try { // in case we get a 404
                const newRequest = await fetch(`https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`);

                if (!newRequest.ok) {
                    // If the fetch failed, throw what message we got
                    throw new Error(`Failed to read the selected book. Status Code: ${newRequest.status} ${newRequest.statusText}`);
                }

                // Try getting text
                newJson = await newRequest.text();

                const pages = [];
                for (let i = 0; i < newJson.length; i += 2000) {
                    const page = newJson.substring(i, i + 2000); // saving every 2000 characters
                    pages.push(page);
                }

                // adding book to shelf (download directory)
                updateBookShelf(selectedBook.title, pages);
                console.log(`Book downloaded: ${selectedBook.title}`);

            } catch (err) {
                // If failed, print error
                console.log(`Error Message: ${err.message}`);
                const retry = await askQuestion('Would you like to read another book? (y/n): ');
                if (retry.toLowerCase() === 'y') {
                    await bookSearch(); // await consumes promise, makes async wait for promise to settle
                } else {
                    console.log('Goodbye:');
                    return;
                }
            }
        } else {
            console.log('Invalid option. Please choose again.');
        }
    } else {
        console.log('No books match the description, try again?');
    }
}

// Function to read a book from the queue. It’s like your personal reading club
async function readDownloads() {
    if (last10.length === 0) {
        console.log("No downloaded books to read.");
        return;
    }

    last10.forEach((book, index) => {
        console.log(`${index + 1}. Title: ${book.title}`);
    });

    const bookChoice = await askQuestion("Enter the number of the downloaded book you want to read: ");
    const selectedBook = last10[parseInt(bookChoice) - 1]; // cast to int, sub 1

    if (!selectedBook) {
        console.log("That's not an option, try again?");
        return readDownloads();
    }

    console.log(`\nSelected: ${selectedBook.title}`);

    const pages = selectedBook.pages;
    let currentPage = 0;
    console.log(`\nPAGE 1\n`);
    console.log(pages[currentPage]);

    let reading = true;
    while (reading) {
        // Paging indexing supported by chatgpt, specifically the idea to give user a next, prev, and exit then indexing based on that
        // continuous input.
        const action = await askQuestion("\nType 'next' for next page, 'prev' for previous page, or 'exit' to exit: ");

        if (action.toLowerCase() === 'next' && currentPage < pages.length - 1) {
            currentPage++;
            console.log(`\nPAGE ${currentPage + 1}\n`);
            console.log(pages[currentPage]);
        } else if (action.toLowerCase() === 'prev' && currentPage > 0) {
            currentPage--;
            console.log(`\nPAGE ${currentPage + 1}\n`);
            console.log(pages[currentPage]);
        } else if (action.toLowerCase() === 'exit') {
            reading = false;
            console.log('Closing reader...');
            return; // Stop reading
        } else {
            console.log("Not a paging option. Please type 'next', 'prev', or 'exit'.");
        }
    }
}

async function menu() {
    console.log("\nBook Menu");
    console.log("1. Search for a book");
    console.log("2. See Downloaded books");
    console.log("3. Leave");
    console.log("4. Read from downloads");
    console.log("5. Clear shelf\n");

    const choice = await askQuestion("Select desired menu option (1-5): ");

    switch (choice) {
        case '1':
            await bookSearch();
            break;
        case '2':
            printDownloadedBooks();
            break;
        case '3':
            console.log("Goodbye:'(");
            rl.close();
            process.exit(0);
        case '4':
            await readDownloads();
            break;
        case '5':
            clearQueue();
            break;
        default:
            console.log("Not a valid option, try again?");
    }

    if (!rl._destroyed) {  // Check if interface is still active
        await menu();
    } else {
        console.log('Readline interface destroyed. Exiting menu.');
    }
}

async function bookSearch() {
    console.log("\nSearching for a book by title or author");

    const searchTerm = await askQuestion(`Please enter the term you want to search for: `);

    console.log(`Searching for books matching ${searchTerm}...`);
    await getBook(searchTerm);

    await menu();
}

menu();
