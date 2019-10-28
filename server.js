// Built-in Node.js modules
var fs = require('fs')
var path = require('path')

// NPM modules
var express = require('express')
var sqlite3 = require('sqlite3')


var public_dir = path.join(__dirname, 'public');
var template_dir = path.join(__dirname, 'templates');
var db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

var app = express();
var port = 8000;

// open usenergy.sqlite3 database
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.use(express.static(public_dir));


// GET request handler for '/'
app.get('/', (req, res) => {
    ReadFile(path.join(template_dir, 'index.html')).then((template) => {
        let response = template;

        let myPromises = [
            getNationalValuesByYear(2017),
            getIndividualValuesByYear(2017)
        ]

        Promise.all(myPromises).then((results) =>{
            let list = "";
            for(state in results[1]) {
                let thisState = results[1][state];
                list = list + `<tr>
                    <td>${thisState.state}</td>
                    <td>${thisState.coal}</td>
                    <td>${thisState.natural_gas}</td>
                    <td>${thisState.nuclear}</td>
                    <td>${thisState.petroleum}</td>
                    <td>${thisState.renewable}</td>
                </tr>`;
            }

            response = response.replace("__COAL__", results[0].coal);
            response = response.replace("__NATURAL__", results[0].natural_gas);
            response = response.replace("__NUCLEAR__", results[0].nuclear);
            response = response.replace("__PETROLEUM__", results[0].petroleum);
            response = response.replace("__RENEWABLE__", results[0].renewable);

            response = response.replace("__LIST__", list);

            WriteHtml(res, response);
        });
    }).catch((err) => {
        //Write404Error(res);
    });
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    ReadFile(path.join(template_dir, 'year.html')).then((template) => {
        let response = template;
        let myPromises = [
            getNationalValuesByYear(req.params.selected_year),
            getIndividualValuesByYear(req.params.selected_year)
        ]

        Promise.all(myPromises).then((results) =>{
            let list = "";
            for(state in results[1]) {
                let thisState = results[1][state];
                list = list + `<tr>
                    <td>${thisState.state}</td>
                    <td>${thisState.coal}</td>
                    <td>${thisState.natural_gas}</td>
                    <td>${thisState.nuclear}</td>
                    <td>${thisState.petroleum}</td>
                    <td>${thisState.renewable}</td>
                    <td>${thisState.total}</td>
                </tr>`;
            }

            response = response.replace("__YEAR__", req.params.selected_year);
            response = response.replace("__COAL__", results[0].coal);
            response = response.replace("__NATURAL__", results[0].natural_gas);
            response = response.replace("__NUCLEAR__", results[0].nuclear);
            response = response.replace("__PETROLEUM__", results[0].petroleum);
            response = response.replace("__RENEWABLE__", results[0].renewable);

            response = response.replace("__LIST__", list);

            WriteHtml(res, response);
        });
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;

        let myPromises = [
            getValuesByState(req.params.selected_state),
            getStateName(req.params.selected_state),
            getNextAndPrev('state_abbreviation', req.params.selected_state)
        ]

        Promise.all(myPromises).then((results) => {
            let data = results[0];
            let stateName = results[1];
            let nextPrev = results[2];
            let list = "";
            for(idx in data) {
                let year = data[idx];
                list = list + `<tr>
                    <td>${year.year}</td>
                    <td>${year.coal}</td>
                    <td>${year.natural_gas}</td>
                    <td>${year.nuclear}</td>
                    <td>${year.petroleum}</td>
                    <td>${year.renewable}</td>
                    <td>${year.total}</td>
                </tr>`;
            }
            response = response.replace("__STATE__", stateName);
            response = response.replace("__LIST__", list);
            response = response.replace("__NEXT_STATE__", nextPrev.next);
            response = response.replace("__PREV_STATE__", nextPrev.prev);
            response = response.replace("__COAL_ARR__", getColumn(data,'coal'));
            response = response.replace("__NATURAL_ARR__", getColumn(data,'natural_gas'));
            response = response.replace("__NUCLEAR_ARR__", getColumn(data,'nuclear'));
            response = response.replace("__PETROLEUM_ARR__", getColumn(data,'petroleum'));
            response = response.replace("__RENEWABLE_ARR__", getColumn(data,'renewable'));
            var stateAb = req.path.substring(7, req.path.length,).toString(); 
			var allStates = ["AK", "AL", "AR", "AZ", "CA","CO","CT","DC","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY"];
		var allStateNames =["Alaska", "Alabama","Arkansas","Arizona","California","Colorado","Conneticut", "Washington D.C.","Delaware","Florida","Georgia","Hawaii","Iowa","Idaho","Indiana","Kansas","Kentucky","Louisiana","Maine","Maryland","Michigan","Minnesota","Missouri","Mississippi","Massachussets","Montana","North Carolina","North Dakota","Nebraska","New Hampshire","New Jersey","New Mexico","Nevada","New York","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island", "South Carolina","South Dakota","Tennessee", "Texas","Utah","Virginia","Vermont","Washington", "Wisconsin", "West Virginia", "Wyoming"];
            response = response.replace("noimage.jpg", stateAb + ".png");
            repsonse = response.replace("No Image", "Flag of " + stateAb);
			
			var index = allStates.indexOf(stateAb);
		response = response.replace("Yearly Snapshot", allStateNames[index] + " Yearly Snapshot");
            WriteHtml(res, response);
        }).catch((err) => {
            console.log(err);
        });

    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        
        let myPromises = [
            getValuesByEnergySource(req.params.selected_energy_type)
        ]

        Promise.all(myPromises).then((results) => {
            let data = results[0];
            let list = "";
            let stateSort = {}
            let yearSort = {}

            for(idx in data) {
                let stateYear = data[idx];
                let thisState = stateSort[stateYear.state_abbreviation];
                let thisYear = yearSort[stateYear.year]
                if(thisState == null) {
                    thisState = [];
                }
                if(thisYear == null) {
                    thisYear = [];
                }
                thisState.push(stateYear.value);
                thisYear.push(stateYear.value);

                stateSort[stateYear.state_abbreviation] = thisState;
                yearSort[stateYear.year] = thisYear;
            }

            for(var year in yearSort) {
                list = list + `<tr>
                <td>${year}</td>`

                let total = 0;
                let thisYear = yearSort[year];
                for (var state in thisYear) {
                    let thisVal = thisYear[state];
                    total = total + thisVal;
                    list = list+`<td>${thisVal}</td>`
                }

                list = list+`<td>${total}</td>
                </tr>`
                
            }
			var energy = ["coal", "natural_gas","nuclear","renewable","petroleum"];
			
			var energyType = req.path.substring(13, req.path.length,).toString();
			console.log(energyType);
			response = response.replace("noimage.jpg", energyType + ".jpeg");
            repsonse = response.replace("No Image", energyType);
            
            response = response.replace("__ENERGY_TYPE__", snakeToUpperCase(req.params.selected_energy_type));
            response = response.replace("__LIST__", list);
            response = response.replace("__ENERGY_COUNTS__", JSON.stringify(stateSort));

            WriteHtml(res, response);
        }).catch((err) => {
            console.log(err);
        });

    }).catch((err) => {
        Write404Error(res);
    });
});

function ReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString());
            }
        });
    });
}

function Write404Error(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error: file not found');
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}

//One value, grouped by year and state : Energy source
//All values, one state, grouped by year : State
//All values, one year, national and grouped by state : Year

function getNationalValuesByYear(year){
    return new Promise((resolve, reject)=> {
        let sql = `
        SELECT
            sum(coal) AS coal,
            sum(natural_gas) AS natural_gas,
            sum(petroleum) AS petroleum,
            sum(nuclear) AS nuclear,
            sum(renewable) AS renewable
        FROM Consumption
        WHERE year = ${year}
        `
        db.get(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

function getIndividualValuesByYear(year){
    return new Promise((resolve, reject)=> {
        let sql = `
        SELECT
            coal,
            natural_gas,
            petroleum,
            nuclear,
            renewable,
            coal + natural_gas + petroleum + nuclear + renewable AS total,
            state_name AS state
        FROM Consumption NATURAL JOIN States
        WHERE year = ${year}
        GROUP BY state_abbreviation
        `
        db.all(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

function getValuesByEnergySource(energySource){
    return new Promise((resolve, reject)=> {
        let sql = `
        SELECT
            ${energySource} AS value,
            year,
            state_name AS state,
            state_abbreviation
        FROM Consumption NATURAL JOIN States
        GROUP BY state_abbreviation, year
        `
        db.all(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

function getValuesByState(state) {
    return new Promise((resolve, reject)=> {
        let sql = `
        SELECT
            coal,
            natural_gas,
            petroleum,
            nuclear,
            renewable,
            coal + natural_gas + petroleum + nuclear + renewable AS total,
            year
        FROM Consumption
        WHERE state_abbreviation LIKE '${state}'
        GROUP BY year
        `
        db.all(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

function getColumn(arr, colName) {
    let output = []
    for(idx in arr) {
        output.push(arr[idx][colName]);
    }
    return JSON.stringify(output);
}



function getStateName(state){
    return new Promise((resolve, reject)=> {
        let sql = `
        SELECT
            state_name
        FROM States
        WHERE state_abbreviation LIKE '${state}'
        `
        db.get(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(data.state_name);
            }
        });
    });
}


var server = app.listen(port);

function snakeToUpperCase(str) {
    let out = "";
    let upper = true;
    for(idx = 0; idx < str.length; idx++) {
        thisChr = str.charAt(idx);
        if(thisChr == "_") {
            out = out + " ";
            upper = true;
        }
        else{
            if(upper) {
                out = out + thisChr.toUpperCase();
                upper=false;
            }
            else{
                out = out + thisChr;
            }
        }
    }
    return out;
}

function getNextAndPrev(field, value) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT DISTINCT ${field} AS val
        FROM Consumption`;
        db.all(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                let out = {};
                let col = JSON.parse(getColumn(data, 'val'));
                let idx = col.indexOf(value);
                out.next = col[(idx + 1) % col.length];
                out.prev = col[(idx + -1 + col.length) % col.length];
                resolve(out);
            }
        });
    })
}