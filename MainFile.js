const readline = require('readline'); // Yo, this lets us talk to the user in the terminal
const fs = require('fs'); // File System, so we can save and load stuff, 'cause saving is important, bro
const path = require('path'); // Helps us work with file paths, ‘cause we don't want things to break, right?
//const fetch = require('node-fetch'); // In case we wanna get stuff from the internet (but we’re keeping it chill for now)

const rl = readline.createInterface({
    input: process.stdin,  // Getting the user's input, like their brainwaves
    output: process.stdout // And sending out our amazing responses
});

const url = 'https://gutendex.com/books?search='; // A URL to search for books, like Google, but for free ebooks

// Where we're keeping the books we recently looked at, don’t want to forget them
const booksFilePath = '/Users/oliviafoster/Gutendex/Last10Books/booksQueue.json'; // A sweet spot in our file system to stash book data

let booksQueue = []; // Our personal stash of books, currently empty (but not for long)

// Let's see if we've saved some books before. If we have, let's load them in. If not... well, we just chill
if (fs.existsSync(booksFilePath)) {
    const fileContent = fs.readFileSync(booksFilePath);  // Read in the file content, 'cause we wanna know what's up
    booksQueue = JSON.parse(fileContent);  // Turn that JSON into actual data we can use, pretty cool right?
}

// Ask the user a question and wait for their answer, like a chill interview
function askQuestion(query) {
    return new Promise(resolve => {
        rl.question(query, answer => {
            resolve(answer);
        });
    });
}

// Save the booksQueue to the file, so we don’t lose all our precious books
function saveQueueToFile() {
    if (!fs.existsSync(path.join(__dirname, 'Last10Books'))) {
        fs.mkdirSync(path.join(__dirname, 'Last10Books'));  // Create the folder if it doesn’t exist, ‘cause we gotta stay organized
    }

    // Turn booksQueue into a format we can save, ‘cause the file doesn't speak JavaScript
    const queueToSave = booksQueue.map(book => ({
        title: book.title,
        pages: book.pages  // Keeping it simple, just titles and pages here
    }));

    // Save it to the file, so we don’t lose it all. Saving is key, my friend
    fs.writeFileSync(booksFilePath, JSON.stringify(queueToSave, null, 2), 'utf-8');
}

// Clear the book queue... sometimes you gotta start fresh, like a new playlist
function clearQueue() {
    booksQueue = []; // Empty out that queue, like deleting a song you’re tired of
    saveQueueToFile(); // Make sure we also save this empty queue, so it's like it never existed
    console.log('The book queue has been cleared.');
}

// Check if the book is in the queue and move it to the front if found, so it's easier to find later
function updateQueueWithBook(title, pages) {
    const bookIndex = booksQueue.findIndex(b => b.title === title);  // Let's see if the book is already in there

    if (bookIndex !== -1) {
        // If we found the book, move it to the front of the line
        booksQueue.unshift(booksQueue.splice(bookIndex, 1)[0]);
    } else {
        // Otherwise, just add it to the front of the queue
        booksQueue.unshift({ title, pages });

        // If the queue gets too big, we toss the last book off like it's a hot potato
        if (booksQueue.length > 10) {
            booksQueue.pop();  // Last book? Sorry, you gotta go.
        }
    }

    // Save the updated queue, 'cause we don’t want to forget anything
    saveQueueToFile();
}

// Print out the books in the queue, ‘cause who doesn’t wanna flex a little
function printBooksQueue() {
    if (booksQueue.length === 0) {
        console.log("No books in the queue."); // Oh no, the queue’s empty. Sad face.
        return;
    }

    console.log("\nBooks in the queue:");
    booksQueue.forEach((book, index) => {
        console.log(`${index + 1}. Title: ${book.title}`); // Listing out our book titles, like a cool library
    });
}

// Function to get a book from Gutendex, because we love free books, right?
async function getBook(str) {
    const request = await fetch(url + str); // Get the book data from the internet, gotta fetch the goods
    const json = await request.json(); // Turn the response into something we can actually use, like turning cereal into milk
    console.log(`Found ${json.count} books.`); // Look how many books we found, it's a vibe

    if (json.count > 0) { // If we actually found books
        const bookTitles = json.results.map((book, index) => {
            console.log(`${index + 1}. Title: ${book.title}, Author: ${book.authors.map(a => a.name).join(', ')}`);
            return book;
        });

        // Ask the user which book they wanna read, like picking a snack at the store
        const choice = await askQuestion(`Please enter the number of the book you'd like to select (1-${json.count}): `);
        const selectedBook = json.results[parseInt(choice) - 1]; // Get the book they picked

        if (selectedBook) {
            console.log(`\nYou selected: ${selectedBook.title} by ${selectedBook.authors.map(a => a.name).join(', ')}`);

            // Fetch the book content, like finding a hidden treasure
            const bookId = selectedBook.id;
            let newJson = '';
            try {
                const newRequest = await fetch(`https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`);

                if (!newRequest.ok) {
                    // If the fetch failed, let the user know and ask if they wanna retry
                    throw new Error(`Failed to fetch the book. Status Code: ${newRequest.status} ${newRequest.statusText}`);
                }

                // If it's all good, get the text of the book
                newJson = await newRequest.text();

                // Now that we have the book, let's break it up into pages, ‘cause who wants to read a 1000-page block?
                const pages = [];
                for (let i = 0; i < newJson.length; i += 2000) {
                    const pageContent = newJson.substring(i, i + 2000);
                    pages.push(pageContent);  // Put each page in the array
                }

                // Add the book to our queue, like adding it to the VIP section
                updateQueueWithBook(selectedBook.title, pages);
                console.log(`Book successfully downloaded and added to the queue: ${selectedBook.title}`);

            } catch (err) {
                // If something goes wrong, let the user know
                console.log(`Error Message: ${err.message}`);
                const retry = await askQuestion('Would you like to try again? (yes/no): ');
                if (retry.toLowerCase() === 'yes') {
                    await bookSearch(); // Retry the search if they’re down
                } else {
                    console.log('Exiting.');
                    return; // Exit if they don't wanna retry
                }
            }
        } else {
            console.log('Invalid choice. Please try again.');
        }
    } else {
        console.log('No books found. Guess we gotta keep searching.');
    }
}

// Function to read a book from the queue. It’s like your personal reading club
async function readBookFromQueue() {
    if (booksQueue.length === 0) {
        console.log("No books in the queue to read."); // Uh oh, no books here. Time to add some!
        return;
    }

    booksQueue.forEach((book, index) => {
        console.log(`${index + 1}. Title: ${book.title}`); // Print out the books we got, you know, for inspo
    });

    const bookChoice = await askQuestion("Please enter the number of the book you'd like to read: ");
    const selectedBook = booksQueue[parseInt(bookChoice) - 1];

    if (!selectedBook) {
        console.log("Invalid choice. Please try again.");
        return readBookFromQueue(); // Retry if invalid input
    }

    console.log(`\nYou selected: ${selectedBook.title}`);

    const pages = selectedBook.pages;  // Now it’s an array, no more Map nonsense
    let currentPage = 0; // Start from the first page
    console.log(`\n---\nBook Preview (Page 1):\n`);
    console.log(pages[currentPage]); // Show the first page

    let navigating = true;
    while (navigating) {
        const action = await askQuestion("\nType 'next' for next page, 'prev' for previous page, or 'quit' to exit: ");

        if (action.toLowerCase() === 'next' && currentPage < pages.length - 1) {
            currentPage++;
            console.log(`\n---\nBook Preview (Page ${currentPage + 1}):\n`);
            console.log(pages[currentPage]);
        } else if (action.toLowerCase() === 'prev' && currentPage > 0) {
            currentPage--;
            console.log(`\n---\nBook Preview (Page ${currentPage + 1}):\n`);
            console.log(pages[currentPage]);
        } else if (action.toLowerCase() === 'quit') {
            navigating = false;
            console.log('Exiting book preview.');
            return; // Stop navigating
        } else {
            console.log("Invalid input. Please type 'next', 'prev', or 'quit'.");
        }
    }
}

// Main menu, like the dashboard for your reading life
async function mainMenu() {
    console.log("\nWelcome to the book search and queue system!");
    console.log("1. Search for a new book");
    console.log("2. View books in the queue");
    console.log("3. Exit");
    console.log("4. Read a book from the queue");
    console.log("5. Clear the book queue\n"); // Added option to clear the queue

    const choice = await askQuestion("\nPlease select an option (1-5): ");

    switch (choice) {
        case '1':
            await bookSearch(); // Book search, duh
            break;
        case '2':
            printBooksQueue(); // Show your book list
            break;
        case '3':
            console.log("Exiting.");
            rl.close(); // Close the chat interface, peace out
            return; // Stop the program
        case '4':
            await readBookFromQueue(); // Read a book from the queue, nice
            break;
        case '5':
            clearQueue(); // Clear the queue like wiping your phone screen
            break;
        default:
            console.log("Invalid option. Please try again.");
    }

    if (!rl._destroyed) {  // Make sure we’re still alive before showing the menu again
        await mainMenu();
    }
}

// Start the fun
async function bookSearch() {
    const searchBy = await askQuestion("Would you like to search by 'title' or 'author'? ");

    if (searchBy.toLowerCase() !== 'title' && searchBy.toLowerCase() !== 'author') {
        console.log("Invalid input, please choose either 'title' or 'author'.");
        return bookSearch(); // Retry if the input is whack
    }

    const searchTerm = await askQuestion(`Please enter the ${searchBy} you want to search for: `);

    console.log(`Searching for books by ${searchBy}...`);
    await getBook(searchTerm); // Go get those books, fam

    // After the search, return to the main menu
    await mainMenu();
}

// Kick things off with the main menu
mainMenu();