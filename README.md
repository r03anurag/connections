# connections
A web application/game like NYT's [Connections](https://www.nytimes.com/games/connections), but with [Wikipedia](https://www.wikipedia.org/) categories. Refer to the link to [Connections](https://www.nytimes.com/games/connections) to get an idea of the rules and
nuances of this game. To be honest, this version of the game is pretty easy, but I figured it'd be neat to try it out and 
get experience with Web Dev skills. 

# Description
[Connections](https://www.nytimes.com/games/connections) is a game in which you are given sixteen (16) topics that 
are grouped into four (4) categories; in this case, these topics are [Wikipedia](https://www.wikipedia.org/) articles,
and the categories are [Wikipedia categories](https://en.wikipedia.org/wiki/Help:Category). The objective is to guess the
way in which these topics(articles) are grouped without making more than four (4) mistakes. If you make 4 mistakes, it's game
over, and you will have to start another game. Hopefully, you enjoy this unique twist to this popular game!

# Getting Started

## Dependencies
* All necessary Python libraries are installed when starting the backend server (see [Running the code](##Running-the-code) section)
* Make sure to install [node.js](https://nodejs.org/en/download/current).
* Code is compatible with any OS. Make sure your Python version is at least 3.12.7 for predictable results.

## Downloading code (follow these steps in order)
1. Download the code from this repository as-is. DO NOT REMOVE OR DELETE ANY FILES. 

## Running the code
* You will need TWO (2) terminal instances - one for the frontend, and one for the backend.
* Backend:
    * Navigate to `connections/` directory, and open a terminal.
    * Type `flask run`. (this will install all Python dependencies)
* Frontend:
    * Navigate to `connections/connections-wikipedia` directory, and open another terminal.
        1. Type `npm install` (only if it is the first time running the code).
        2. Type `npm run dev` to run the server locally. 
            * (OPTIONAL) If you want to build this app for production, additionally run the command `npm run build`.
        3. Copy paste the url containing "localhost" (should be displayed in the terminal) into
           your browser. 
# Authors
* Anurag Renduchintala.

# Versions
* 1/28/2025
    * No need to manually `pip install` Python packages.
    * No need to download the dataset. 
* 1/27/2025
    * Initial release.

# Acknowledgements
* Dataset from Kaggle; [link](https://www.kaggle.com/datasets/jjinho/wikipedia-20230701/data?select=wiki_2023_index.parquet).


