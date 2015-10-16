// jshint devel:true
//'use strict';

var APIurl = 'data.json',
    container = '.dash-app',
    dash = {},
    raw,
    meta = {};

var classes = [
  { name: 'Class/Student', keys: ['ClassName','StudentName'] },
  { name: 'Error type', keys: ['ErrorCategory','AssociatedStandard','ErrorType'] },
  { name: 'Subject/Assignment', keys: ['SubjectName','AssignmentName'] },
];

var initView = function(){
  var selectors = d3.select(container).append('div').classed('controls', 1);
  function addSelector (className, listener){
    return selectors.append('div').classed( className + ' selector', 1)
      .append('ul').selectAll('li').data(classes).enter().append('li')
      .text( d => d.name )
      .on('click', listener);
  }
  dash.vMenu = addSelector('vselector', selectV);
  dash.hMenu = addSelector('hselector', selectH);
  dash.filter = selectors.append('div').classed('dash-filter', 1);
  dash.filter.name = dash.filter.append('div').classed('filter-name', 1);
  dash.filter.list = dash.filter.append('div').classed('filter-list', 1)

  dash.tableWrap = d3.select(container).append('div').classed('dash-table', 1);
};

var selectV = function(d){
  dash.vClass = d;
  dash.vMenu.classed('active', 0).filter( dd => d.name == dd.name ).classed('active', 1);
  dash.hMenu.classed('hidden', 0).filter( dd => d.name == dd.name ).classed('hidden', 1);
  selectH( d.name == classes[0].name ? classes[1] : classes[0], d );
};
var selectH = function(d){
  dash.hClass = d;
  dash.hMenu.classed('active', 0).filter( dd => d.name == dd.name ).classed('active', 1);
  updateFilter( classes.find( dd => dd.name != d.name && dd.name != dash.vClass.name ) );

  meta
  meta.hKeys = d.keys.map(d=>d).slice(0, -1);
  meta.hKeysFull = d.keys.map(d=>d);
  meta.hKeys.unshift('overall');
  meta.vKeys = dash.vClass.keys.map(d=>d);
  meta.vKeys.unshift('overall');
  meta.vName = dash.vClass.name;
  meta.hName = dash.hClass.name;
  console.log(raw, meta)

  dash.table = new Table(raw, meta);
};
var updateFilter = function(d){
  var overall = 'All ' + d.name + 's',
    fKeys = d.keys.map(d=>d);
  fKeys.unshift('overall');

  dash.filter.name.text(overall)
    .on('click', toggleList);
  dash.filter.list.select('ul').remove();
  dash.filter.list.append('ul').selectAll('li').data(DD.tree(raw, fKeys)).enter()
    .append('li').attr('class', d => 'depth-' + d.depth )
    .text( d => d3.values(d.keys)[d.depth].replace('Overall', overall))
    .on('click', selectFilter);

  meta.fKeys = d.keys.map(d=>d);
  meta.fName = d.name;

  function toggleList(){
    var active = !dash.filter.list.classed('active');
    dash.filter.list.classed('active', active);
    d3.selectAll('.dash-app .dash-table').classed('blured', active);
  }
  function selectFilter(d){
    console.log(d);
    toggleList();
    dash.filter.name.text(d3.values(d.keys)
      .reduce((a, b) => (a + (a ? ' / ' : '') + (b || '')), '')
      .replace('Overall / ','').replace('Overall', overall)
    );
    var rawFiltered = raw.filter(function(dd){
      var isEqual = true;
      for (var key in d.keys)
        if (d.keys[key] != dd[key] )
          isEqual = false;
      return isEqual;
    });
    console.log(raw.length, rawFiltered.length);
    dash.table = new Table(rawFiltered, meta)  ;
  }
};

var loadData = function(err, data){
  if (err) { throw err; }
  if (data.ErrorMessage) { throw data.ErrorMessage; }
  if (!data.Success || !data.RowCount || !data.Data) { throw data; }

  raw = data.Data;
  addDates(raw);
  raw.forEach( d => d.overall = 'Overall' );
//console.log(raw);

  selectV(classes[0]);

};

d3.json(APIurl, loadData);
initView();







function addDates(raw){
  //console.log(raw);
    raw.forEach(function(d){
      var num = 1;
      if (!d.AssignmentName)
        d.AssignmentName = "Essay #" + Math.round(8 * Math.random() + 1);
      if (d.AssignmentName.indexOf('Essay') != -1) {
        num = +d.AssignmentName.replace('Essay #', '');
      } else if (d.AssignmentName == "WritingPoint Demo") {
        num = 7;
      } else if (d.AssignmentName == "My Vacation") {
        num = 8;
      }
      d._date = new Date(2015, 7, num * 3);
      d.date = d3.time.format('%Y.%m.%d')(d._date);
      //console.log(num, d.date);
    });

}
