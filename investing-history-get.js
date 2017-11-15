var cheerio = require('cheerio');
var program = require('commander');

var utils = require('./utils');

var DATE_FORMAT = "DD/MM/YYYY";
var HISTORY_URL = "https://uk.investing.com/instruments/HistoricalDataAjax";

// ================= parse program arguments

program.version('0.0.1')
    .description('Download information into a csv file: Date, Price, Open, High, Low.' +
        'Use the search functionality to get the <id> to use for a particular resource.')
    .arguments('<id>', 'id of the commodity to fetch')
    // .option('-u --url <url>', 'url for fetching historical data, default to "' + DEFAULT_HISTORY_URL + '"')
    //.option('-i --id <id>', 'id of the commodity to fetch')
    .option('-s --startdate [date]', 'start date in ' + DATE_FORMAT + ' format.', utils.asDate)
    .option('-e --enddate [date]', 'end date in ' + DATE_FORMAT + ' format.', utils.asDate)
    .option('-f --file [file]', 'result file. If none, the result will be printed to the console.')
    .option('-v --verbose', 'enable verbose mode.')
    .parse(process.argv);

var verbose = program.verbose;

// check for required param
if (!program.args.length) {
    console.log("missing required argument <id>");
    program.help();
    return;
}

var id = program.args[0];
var url = HISTORY_URL;

if (verbose) {
    console.log("getting info for id = ", id);
    console.log("start date: ", program.startdate, ", end date: ", program.enddate, ", file: ", program.file);
}

// ================= main

// form data
var post_data = {
    action: 'historical_data',
    curr_id: id,
    st_date: utils.formatDate(program.startdate, DATE_FORMAT), //'07/19/2015',
    end_date: utils.formatDate(program.enddate, DATE_FORMAT), //'08/19/2016',
    interval_sec: 'Daily',
    sort_col: 'date',
    sort_ord: 'DESC'
};

utils.postInvesting(url, post_data, verbose).then(
    function (body) {
        // got a body, parse it to csv
        var csv = bodyToCSV(body);
        // write results to a file or to the console depending on the -f argument
        if (program.file) {
            utils.writeToFile(program.file, csv);
        } else {
            console.log(csv);
        }
    },

    function (errorData) {
        // could not get data
        console.error("An error occurred (id=" + id + "): ", errorData.error, ", ", errorData.httpResponse.statusCode);
    }
);

// ================= functions


/**
 * Parse the html body: extract data from the results table into a csv.
 * @param body  the html body
 * @returns {string} the csv, with headers
 */
function bodyToCSV(body) {
    var $ = cheerio.load(body);
    var csv = []; // an array of csv records
    var headers = [];

    // get the first table, which holds the interesting data
    var table = $('table').first();

    // get headers
    table.find('th').each(function () {
        headers.push($(this).text());
    });
    csv.push(headers.join(', '));

    // get data
    table.find('tr').each(function () {
        var line = [];
        $(this).children('td').each(function () {
            line.push($(this).text());
        });
        line = line.join(', ');
        if (line.length) csv.push(line);
    });

    if (verbose)
        console.log("Found " + (csv.length - 1) + " records.");

    return csv.join("\n");

}