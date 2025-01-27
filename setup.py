########### file responsible for handling data, and setting up the 16 Wikipedia article topics and the 4 categories ###########
import dask.dataframe
from collections import defaultdict
#from multiprocessing import Process, Manager, Queue, SimpleQueue
import string
import wikipedia as wp
import random
import os
from math import ceil
from datetime import datetime as dt
import csv

'''
return categories and their article ids - like an inverted index. Example Structure:
{
    "category1": "1, 2, 3, ...",
    "category2": "10, 11, 12, ...",
    ...
    "category_n": "998, 999, 1000, ..."
}
'''
'''
File structure is as follows:
    - categories_to_articles-{start}-{x}.parquet
        |category| |id|
        ---------- -----
DO NOT DIRECTLY CALL THIS FUNCTION. USE get_inverted_index().
Takes around 30 mins.
'''
def form_inverted_categorical_index(df):
    starts = string.ascii_uppercase + string.digits
    chunk = 6
    all_ddfs = dict()
    for idx in range(0,len(starts),chunk):
        category_inv_index = defaultdict(str)
        starter_portion = starts[idx:idx+chunk]
        for start in starter_portion:
            if start != " ":
                print(f"Forming categorical index from articles beginning with {start}...")
            else:
                print("Forming categorical index from remaining articles")
            cond = df['title'].str.startswith(start) if start.isalnum() \
                else df['title'].apply(lambda ti: not ti[0].isalnum())
            rel = df[cond].reset_index(drop=True)
            div = 225_000
            rel_length = len(rel)
            num_parts = ceil(rel_length/div)
            part_no = 0
            for part in range(0, rel_length, div):
                part_no += 1
                pids = rel.loc[part:part+div, 'id'].compute()
                pcats = rel.loc[part:part+div, 'categories'].compute()
                for i in range(len(pids)):
                    this_page_id = pids.iloc[i]
                    these_cats = pcats.iloc[i]
                    for tc in these_cats:
                        category_inv_index[tc] += (this_page_id + ",")
                print(f"{start} {part_no}/{num_parts}")
            print(f"{start if start != " " else "Remaining"} articles done!")
        this_ddf = dask.dataframe.DataFrame.from_dict({'category': list(category_inv_index.keys()),
                                                        'id': list(category_inv_index.values())
                                                    })
        all_ddfs[starter_portion] = this_ddf
        # write to parquet for future reference
        dask.dataframe.to_parquet(df=this_ddf, path="wiki_2023_index.parquet/", 
                              name_function= lambda x: f"category_inverted_index-{starter_portion}.parquet")
        print(f"{starter_portion} articles processed.")
    # write this file (DO-NOT-REMOVE) to directory to indicate that inverted index exists
    flagfile = open("wiki_2023_index.parquet/DO-NOT-REMOVE", 'w')
    flagfile.close()
    return all_ddfs

'''
Main Function that will handle inverted index creation
'''
def get_inverted_index(df):
    print("Obtaining inverted index...")
    datafiles = os.listdir("wiki_2023_index.parquet")
    iidx = dict()
    extract_range = lambda fn: fn[fn.find('category_inverted_index-')+len('category_inverted_index-'):\
                                         fn.find(".parquet")]
    if "DO-NOT-REMOVE" in datafiles:
        for file in datafiles:
            if file.startswith('category_inverted_index-'):
                lnp = extract_range(fn=file)
                iidx[lnp] = dask.dataframe.read_parquet(path="wiki_2023_index.parquet/"+file)
        print("Inverted index is present, moving on")
    else:
        iidx = form_inverted_categorical_index(df=df)
    return iidx

'''
Function that returns a dict with article's info. It has the following properties:
    - title: str -> Wikipedia article title
    - id: int -> Unique identifier of a Wikipedia article.
    - category: str -> Selected category of the wikipedia article
    - level: Level -> Difficulty of being able to guess the article as part of its category. 
                      Values are 'Easy' (1), 'Medium' (2), 'Hard' (3), and 'Extreme' (4).
                        - May initially be 'Unknown' (0)
    - solved: bool -> Has this article and its group been identified?
'''
def create_article_object(id_, categ: str, lvl: int = 0, solved: bool = False, title: str = ""):
    if title == "":
        title = wp.page(pageid=id_).title
    return {"title": title, "id": id_, "category": categ, "level": lvl, "solved": solved}
    
# helper function to get all article IDs pertaining to a category
def get_all_article_ids_for_category(category: str, datas: dict):
    all_ids = ""
    for key in datas.keys():
        this_idx = datas[key]
        ids = this_idx[this_idx['category'] == category]['id'].compute()
        if len(ids) != 0:
            ids = ids.item()
        else:
            ids = ""
        all_ids += ids
    all_ids_as_list = all_ids.split(",")
    all_ids_as_list.pop()
    return all_ids_as_list

# helper function that verifies a category. Specifically, it does this:
'''
# 3. Make sure there is no there is no non-categorical page with the same name,
#    and that it is not generic.
lc = categ.lower().strip()
if 'wiki' in lc or lc in ('dead people', 'living people'):
    continue
try:
    page = wp.page(title=categ, auto_suggest=False)
    if not page.title.startswith('Category:'):
        continue
except:
    pass
'''
# and this:
'''
if categ in categories or len(article_ids) < 4:
    continue
'''
def verify_category(category: str, collected_categories: set, article_ids: list):
    lc = category.lower().strip()
    if 'wiki' in lc or lc in ('dead people', 'living people'):
        return False
    try:
        page = wp.page(title=category, auto_suggest=False)
        if not page.title.startswith('Category:'):
            return False
    except:
        pass
    if category in collected_categories or len(article_ids) < 4:
        return False
    return True

'''
Function that selects 4 categories, and 4 unique articles per category.
Categories and articles will be picked from all dataframes, to ensure variety.
Don't pick a category if there is a non-categorical page with the same name.
Don't pick generic categories like 'Living people' or 'Dead people', or 'wiki' categories.

Inputs: dfs, a dict of dask dataframes containing 
        start character ranges and inverted indices of Wikipedia articles.

        Example:
        {'ABCDEF': dask.dataframe containing ABCDEF indices, 
         'GHIJKL', dask.dataframe containing GHIJKL indices,
         ...
         }

Output: tuple(list of articles' info. stored in dicts, 
              dict mapping category -> count). 
'''
def get_articles_and_categories(dfs: dict):
    asNcs = list()
    category_counts = dict()
    categories = set()
    ids = set()
    goal = 4
    ranges = list(dfs.keys())
    print("Initializing categories and articles...")
    while len(asNcs) < 16:
        # randomly choose a dataframe range (ex. ABCDEF)
        df_range = random.choice(ranges)
        # randomly choose a category from this range
        categ_item = random.choice(dfs[df_range]['category'])
        categ = categ_item.compute()
        # get the artcle ids
        article_ids = get_all_article_ids_for_category(category=categ, datas=dfs)
        # verify the category
        check = verify_category(category=categ, collected_categories=categories,
                                article_ids=article_ids)
        if not check:
            continue
        categories.add(categ)
        # 5. Make sure that the randomly chosen articles are NOT chosen before
        while len(ids) < goal:
            chosen_aids = random.sample(article_ids, k=4)
            ids.update(chosen_aids)
        # 6. Add these to the collection
        for a in chosen_aids:
            o = create_article_object(id_ = a, categ = categ)
            asNcs.append(o)
        # 7. Update category counts and goal
        category_counts[categ] = len(article_ids)
        goal += 4
        print(f"{(goal//4)-1}/4 categories completed")
    return asNcs, category_counts

'''
Function that calculates the difficulties of groups. Can be based on many heuristics.
For example, the more number of articles that the category has, the easier (more well-known).
Also shuffles the board.

Inputs: outputs from get_articles_and_categories()
'''
def assign_group_difficulty(board: list, counts: list):
    print("Assigning difficulty...")
    final_board = board.copy()
    final_board = sorted(final_board, key= lambda item: counts[item['category']], reverse=True)
    for i in range(len(final_board)):
        final_board[i]['level'] = (i//4)+1
    print("All done. Game is ready!")
    random.shuffle(final_board)
    return final_board

'''
Function that archives previously generated puzzles
'''
def archive_puzzle(board: list):
    if not os.path.exists("archive/"):
        os.mkdir("archive/")
    now = dt.now()
    fn = f"archive/puzzle-{now.year}_{now.month}_{now.day}-{now.hour}_{now.minute}_{now.second}_{now.microsecond}.csv"
    with open(fn,"w", encoding="utf-8", newline="") as csvfile:
        fieldnames = ["title","id","category","level","solved"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(board)
    print(f"Game has been archived in the 'archive/' directory as {fn}")

'''
Read a random archived puzzle, shuffle it, and return.
'''
def from_archive():
    board = []
    archived_puzzles = os.listdir("archive/")
    csvfile = open("archive/"+random.choice(archived_puzzles), 'r', newline='')
    print(csvfile)
    fieldnames = ["title","id","category","level","solved"]
    reader = csv.DictReader(csvfile, fieldnames=fieldnames)
    next(reader, None)
    for row in reader:
        ao = create_article_object(id_ = row["id"], categ = row["category"], 
                                   lvl = row["level"], title= row["title"])
        board.append(ao)
    random.shuffle(board)
    return board

'''
Function that returns a dictionary, whose structure is as follows:
key: {id (1-16), {output of create_article_object() with all info}}
'''
def prepare_game(board: list):
    dc = dict()
    for i in range(len(board)):
        dc[i+1] = board[i].copy()
    return dc

'''
Main function that runs all procedures. Call this.
'''
def main_setup(archive: bool = False):
    # read the dataset as a dask df
    # (https://www.kaggle.com/datasets/jjinho/wikipedia-20230701/data?select=wiki_2023_index.parquet)
    df = dask.dataframe.read_parquet('wiki_2023_index.parquet/wiki_2023_index.parquet',
                                     columns=['id','title','categories'])
    final_game_board = None
    if archive:
        gboard = from_archive()
        final_game_board = prepare_game(gboard)
    else:
        invidxs = get_inverted_index(df=df)
        gboard, ccs = get_articles_and_categories(dfs=invidxs)
        gboard = assign_group_difficulty(board=gboard, counts=ccs)
        archive_puzzle(gboard)
        final_game_board = prepare_game(gboard)
    return final_game_board

if __name__ == "__main__":
    result = main_setup(True)
    print(result)