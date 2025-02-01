import React, { useState, useEffect } from 'react'
import './App.css'
import axios, { isAxiosError } from 'axios'

// helper function - counts instances of an element in an array
function count(arr, elt) {
  let times = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === elt) {
      times++;
    }
  }
  return times;
}

// main function that defines the classic, 4 x 4 Connections game board.
export default function ConnectionsGame() {
  // variables to keep track of data
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(null);
  const [ng, setNg] = useState(false);
  const [toggle, setToggle] = useState(false);

  const [clicked, setClicked] = useState(Array(16).fill(false));
  const [groupsSolved, setGroupsSolved] = useState(0);

  const [yellowSolved, setYellowSolved] = useState(false);
  const [yellowCateg, setYellowCateg] = useState("");

  const [greenSolved, setGreenSolved] = useState(false);
  const [greenCateg, setGreenCateg] = useState("");

  const [blueSolved, setBlueSolved] = useState(false);
  const [blueCateg, setBlueCateg] = useState("");

  const [purpleSolved, setPurpleSolved] = useState(false);
  const [purpleCateg, setPurpleCateg] = useState("");

  const [numMistakesLeft, setNumMistakesLeft] = useState(4);
  // constant mapping level => color if solved
  const lvl_to_color = {1: "#f5cc02", 2: "#5cc902", 3: "#bed3e6", 4: "#a22dbd"};
  // mapping for what message to display if all categories were solved, based on mistakes left
  const final_messages = {4: "Perfect", 3: "Splendid", 2: "Great", 1: "Phew", 0: "Next time"}

  // helper function to get the idxs of the buttons clicked
  function getClickedIndices() {
    let nc = [];
    for (let j = 0; j < clicked.length; j++) {
      if (clicked[j]) {
        nc.push(j+1);
      }
    }
    return nc;
  }

  // what to do if a game item is clicked (provided that 4 are not clicked already)
  function handleGameItemClick(i) {
    if (count(clicked, true) < 4) {
      // update the corresponding clicked state for the button
      clicked[i-1] = !clicked[i-1];
      setClicked(clicked.slice());
    }
    else if (count(clicked, true) == 4 && clicked[i-1]) {
      clicked[i-1] = false;
      setClicked(clicked.slice());
    }
  }

  // what to do if a user wants to play an archived game.
  const handleArchivedGameClick = async () => {
    const agame_response = await axios.post("http://localhost:5000/api/archive", "");
    // set the variables
    setData(agame_response.data); 
    setClicked(Array.from(16).fill(false));
    setYellowCateg("");
    setYellowSolved(false);
    setGreenCateg("");
    setGreenSolved(false);
    setBlueCateg("");
    setBlueSolved(false);
    setPurpleCateg("");
    setPurpleSolved(false);
    setNumMistakesLeft(4);
    setGroupsSolved(0);
    setLoading(false);
    // update saved user data
    axios.post("http://localhost:5000/api/save", 
      {"data": agame_response.data, 
       "mistakes": 4,
       "yellowSolved": false,
       "yellowCateg": "",
       "greenSolved": false,
       "greenCateg": "",
       "blueSolved": false,
       "blueCateg": "",
       "purpleCateg": "",
       "purpleSolved": false
      }
    );
    setNg(false);
  }

  // what to do if new game button is clicked
  function handleNewGameClick() {
    setNg(true);
    setToggle(!toggle);
  }

  // what to do if the clear button is clicked
  function handleClearClick() {
    setClicked(Array(16).fill(false));
  }
  
  // Save button handler - send data state to server
  const handleSaveClick = async () => {
    const _ = await axios.post("http://localhost:5000/api/save", 
                    {"data": data, 
                     "mistakes": numMistakesLeft,
                     "yellowSolved": yellowSolved,
                     "yellowCateg": yellowCateg,
                     "greenSolved": greenSolved,
                     "greenCateg": greenCateg,
                     "blueSolved": blueSolved,
                     "blueCateg": blueCateg,
                     "purpleCateg": purpleCateg,
                     "purpleSolved": purpleSolved
                    }
                );
    alert("Progress saved!");
  }

  // helper function to calculate swaps
  function calculateSwapPattern(levelidxs, originalidxs) {
    let pattern = [];
    let s1 = new Set(levelidxs);
    let s2 = new Set(originalidxs);
    let diff1 = Array.from(s1.difference(s2));
    let diff2 = Array.from(s2.difference(s1));
    if (diff1.size == 0) {
      for (let l = 0; l < levelidxs.length; l++) {
        pattern.push([originalidxs[l], levelidxs[l]]);
      }
    } else {
      for (let m = 0; m < diff2.length; m++) {
        pattern.push([diff1[m], diff2[m]]);
      }
    }
    return pattern;
  }

  /* submit button handler. If 4 game items selected, check to see if they are the same category,
     and perform the appropriate action. */
  const handleSubmitClick = () => {
    let result = isSameGroup();
    // if group is correct
    if (result[0]) {
      // swap the four correct game items with 4 other ones, based on level
      let level_indices = Array.from({ length: 4 }, (_, i) => (4*(result[6]-1))+i+1);
      let ridcs = result.slice(1, 5);
      let swapPattern = calculateSwapPattern(level_indices, ridcs);
      for (let x = 0; x < swapPattern.length; x++) {
        [data[swapPattern[x][0]], data[swapPattern[x][1]]] = [data[swapPattern[x][1]], data[swapPattern[x][0]]];
      }
      // update the solved categories
      for (let aa = 0; aa < level_indices.length; aa++) {
        data[level_indices[aa]].solved = true;
      }
      // keep track of which level was solved
      if (result[6] == 1) {
        setYellowSolved(true);
        setYellowCateg(result[5]);
      } else if (result[6] == 2) {
        setGreenSolved(true);
        setGreenCateg(result[5]);
      } else if (result[6] == 3) {
        setBlueSolved(true);
        setBlueCateg(result[5]);
      } else if (result[6] == 4) {
        setPurpleSolved(true);
        setPurpleCateg(result[5]);
      }
      // update the data
      let datacopy = structuredClone(data);
      setData(datacopy);
      // reset clicked
      setClicked(Array(16).fill(false));
      // note that we solved a group
      let groupsSolvedNow1 = Math.min(groupsSolved+1, 4);
      setGroupsSolved(groupsSolvedNow1);
      // what message to output if all groups are solved
      let numMistakesLeftNow2 = numMistakesLeft;
      if (groupsSolvedNow1 == 4) {
        alert(final_messages[numMistakesLeftNow2]);
      }
    } 
    // group is wrong. Decrement numMistakesLeft.
    else {
      let numMistakesLeftNow1 = Math.max(numMistakesLeft-1, 0);
      setNumMistakesLeft(numMistakesLeftNow1); 
      if (numMistakesLeftNow1 == 0) {
        alert(final_messages[0]);
      }
    }
  }

  // fetch from backend
  function fetchData() {
    // if saved data
    if (!ng) {
      axios.get("http://localhost:5000/api/data", 
                {headers: 
                  {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                  }
                })
          .then((response) => {
                                let retrieved = response.data;
                                let saved = retrieved.saved;
                                let ys = retrieved.yellowSolved;
                                let gs = retrieved.greenSolved;
                                let bs = retrieved.blueSolved;
                                let ps = retrieved.purpleSolved;
                                setSaved(saved);
                                setData(retrieved.data);
                                if (saved) {
                                  setYellowCateg(retrieved.yellowCateg);
                                  setYellowSolved(ys);
                                  setGreenCateg(retrieved.greenCateg);
                                  setGreenSolved(gs);
                                  setBlueCateg(retrieved.blueCateg);
                                  setBlueSolved(bs);
                                  setPurpleCateg(retrieved.purpleCateg);
                                  setPurpleSolved(ps);
                                  setNumMistakesLeft(retrieved.mistakes);
                                  setGroupsSolved(ys+bs+gs+ps);
                                }
                                setLoading(false);
                              }
                )
          .catch((error) => {console.error("Error fetching data:", error);})
      } else {
          axios.get("http://localhost:5000/api/new", 
            {headers: 
              {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
              }
            })
            .then((response) => {
              let rd = response.data.data;
              setData(rd); 
              setClicked(Array.from(16).fill(false));
              setYellowCateg("");
              setYellowSolved(false);
              setGreenCateg("");
              setGreenSolved(false);
              setBlueCateg("");
              setBlueSolved(false);
              setPurpleCateg("");
              setPurpleSolved(false);
              setNumMistakesLeft(4);
              setGroupsSolved(0);
              setLoading(false);
              // update saved data
              axios.post("http://localhost:5000/api/save", 
                {"data": rd, 
                 "mistakes": 4,
                 "yellowSolved": false,
                 "yellowCateg": "",
                 "greenSolved": false,
                 "greenCateg": "",
                 "blueSolved": false,
                 "blueCateg": "",
                 "purpleCateg": "",
                 "purpleSolved": false
                }
              );
              setNg(false);
            });
      }
  }

  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, [toggle]);

  // function that, if 4 items are clicked, determines if all 4 items are in the same group.
  function isSameGroup() {
    if (count(clicked, true) == 4) {
      let indices = getClickedIndices();
      let cats = new Set();
      for (let ss = 0; ss < indices.length; ss++) {
        cats.add(data[indices[ss]].category);
      }
      return [cats.size == 1, indices[0], indices[1], indices[2], indices[3], 
              cats.values().next().value, data[indices[0]].level];
    }
  }

  return (
    <>
    <h1>Welcome to <a href="https://www.nytimes.com/games/connections">Connections</a>, 
        but with a twist - it's the <a href="https://www.wikipedia.org/">Wikipedia</a> Edition!</h1>
    <h3>Connections is a popular New York Times game in which you guess how words are interconnected.
        You should try it out; it's really fun! Click on the link above to do so. </h3> <br></br>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[1].title} handleClick={() => handleGameItemClick(1)} 
              clickedVal={clicked[0]} solvedVal={loading ? false: data[1].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[2].title} handleClick={() => handleGameItemClick(2)} 
              clickedVal={clicked[1]} solvedVal={loading ? false: data[2].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[3].title} handleClick={() => handleGameItemClick(3)} 
              clickedVal={clicked[2]} solvedVal={loading ? false: data[3].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[4].title} handleClick={() => handleGameItemClick(4)} 
              clickedVal={clicked[3]} solvedVal={loading ? false: data[4].solved}></GameItem>
    <p style={{backgroundColor: lvl_to_color[1]}}  
       className="categ-p" hidden={!yellowSolved}><br></br>{yellowCateg.toUpperCase()}</p>
    <br></br>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[5].title} handleClick={() => handleGameItemClick(5)} 
              clickedVal={clicked[4]} solvedVal={loading ? false: data[5].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[6].title} handleClick={() => handleGameItemClick(6)} 
              clickedVal={clicked[5]} solvedVal={loading ? false: data[6].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[7].title} handleClick={() => handleGameItemClick(7)} 
              clickedVal={clicked[6]} solvedVal={loading ? false: data[7].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[8].title} handleClick={() => handleGameItemClick(8)} 
              clickedVal={clicked[7]} solvedVal={loading ? false: data[8].solved}></GameItem>
    <p style={{backgroundColor: lvl_to_color[2]}}  
       className="categ-p" hidden={!greenSolved}><br></br>{greenCateg.toUpperCase()}</p>
    <br></br>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[9].title} handleClick={() => handleGameItemClick(9)} 
              clickedVal={clicked[8]} solvedVal={loading ? false: data[9].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[10].title} handleClick={() => handleGameItemClick(10)} 
              clickedVal={clicked[9]} solvedVal={loading ? false: data[10].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[11].title} handleClick={() => handleGameItemClick(11)} 
              clickedVal={clicked[10]} solvedVal={loading ? false: data[11].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[12].title} handleClick={() => handleGameItemClick(12)} 
              clickedVal={clicked[11]} solvedVal={loading ? false: data[12].solved}></GameItem>
    <p style={{backgroundColor: lvl_to_color[3]}}  
       className="categ-p" hidden={!blueSolved}><br></br>{blueCateg.toUpperCase()}</p>
    <br></br>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[13].title} handleClick={() => handleGameItemClick(13)} 
              clickedVal={clicked[12]} solvedVal={loading ? false: data[13].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[14].title} handleClick={() => handleGameItemClick(14)} 
              clickedVal={clicked[13]} solvedVal={loading ? false: data[14].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[15].title} handleClick={() => handleGameItemClick(15)} 
              clickedVal={clicked[14]} solvedVal={loading ? false: data[15].solved}></GameItem>
    <GameItem mistakesLeft={numMistakesLeft} display={loading ? "": data[16].title} handleClick={() => handleGameItemClick(16)} 
              clickedVal={clicked[15]} solvedVal={loading ? false: data[16].solved}></GameItem>
    <p style={{backgroundColor: lvl_to_color[4]}}  
       className="categ-p" hidden={!purpleSolved}><br></br>{purpleCateg.toUpperCase()}</p>
    <br></br>
    <p style={{fontSize: 18}}>Mistakes remaining: {numMistakesLeft}</p>
    <button className="utility" id="unewgame" onClick={handleNewGameClick} style={{borderColor: "black"}}>
            <b>New Game</b></button>
    <button className="utility" id="uarchive" onClick={handleArchivedGameClick} style={{borderColor: "black"}}>
            <b>Archived Game</b></button>
    <button className="utility" id="uclear" onClick={handleClearClick} style={{borderColor: "black"}}>
            <b>De-select All</b></button>
    <button className="utility" id="usave" onClick={handleSaveClick} style={{borderColor: "black"}}>
            <b>Save</b></button>
    <button className="utility" id="usubmit" hidden={count(clicked, true) != 4} onClick={handleSubmitClick} 
            style={{borderColor: "black"}}><b>Submit</b></button>
    <p><b>Note: When requesting a new game, it may take upto 15 seconds to load.</b></p>
    </>
  )
}

// function to define a clickable connections GameItem (button) with a text value
function GameItem({display, clickedVal, handleClick, solvedVal, mistakesLeft}) {
  // conditionally set the style of the button
  const style = clickedVal ? {backgroundColor: "#383b39", color: "white"}: {backgroundColor: "#edebdd", color: "black"};
  return <button hidden={solvedVal || (mistakesLeft == 0)} className="game-item" onClick={handleClick} 
                 style={style}><b>{display.toUpperCase()}</b></button>
}