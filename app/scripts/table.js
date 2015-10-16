function Table(rawData, meta, container = '.dash-table') {

  var vKeys = meta.vKeys,
      hKeys = meta.hKeys,
      hKeysFull = meta.hKeysFull,
      fKeys = meta.fKeys,
      hName = meta.hName,
      vName = meta.vName,
      fName = meta.fName,
      timeExtent = d3.extent(rawData, d => d._date),
      data = processData(rawData,vKeys, hKeys),
      fold = {};

  data.forEach( (d, i) => d.i = i );

  console.log(meta, vKeys, vName, hKeys, hName, fKeys,rawData,data);

  d3.select(container).select('table').remove();

  var table = d3.select(container).append('table');

  var Table = new makeTable(table, data, 'base', hKeys, vKeys, hName, vName);
  Table.fold.h(1);
  Table.fold.v(1);

  return this;



  function processData(_rawData,_vKeys, _hKeys){
    console.log(_rawData.length,_vKeys, _hKeys)
    var _data = DD.tree2(_rawData, _vKeys, _hKeys);
    DD.calcStat(_data);
    DD.byDate(_data);
    DD.addHeads(_data);
    return _data;
  }

  function makeTable(table, data, type, _hKeys, _vKeys, _hName, _vName){
    console.log(type,data,hName);
    this.type = type;
    var self = this,
        tbody = table.append('tbody'),
        tr = tbody.selectAll('tr').data(data).enter().append('tr')
          .attr('class', d => (d.head ? 'level-head ' : '') + ' level-' + d.level ),
        trHead = tr.filter( d => d.head ),
        trBody = this.trBody = tr.filter( d => !d.head )
          .on('click', type == 'base' ? showInfo : showErrors),
        td = tr.selectAll('td').data( d => d.columns ).enter().append('td'),
        tdHead = td.filter( d => d.head )
          .attr('class', d => 'level-head level-' + d.level + ' depth-' + d.depth ),
        tdHeadH = tdHead.filter( d => d.head == 'h' ).classed('head-h', 1),
        tdHeadHName = tdHeadH.append('div')
          .text( d => l2k(keysFormat(d.keys, _hName), d.depth) )
          .on('click', foldH).classed('head-name', 1),
        sortByDelta = tdHeadH.filter( d => d.withDate ).append('div')
          .attr('class', 'sort-delta sort-arrow').text('▼ ▲')
          .on('click', onSortByDelta)
          .each( function(d) { d.thisDelta = this; } ),
        sortByValue = tdHeadH.append('div')
          .attr('class', 'sort-value sort-arrow').text('▼ ▲')
          .on('click', onSortByValue)
          .each( function(d) { d.thisValue = this; } ),
        tdHeadV = tdHead.filter( d => d.head == 'v' )
          .attr('class', d => 'head-v level-head level-' + d.level + ' depth-' + (d.depth) )
          .text( d => l2k(keysFormat(d.keys, _vName), d.depth) ).filter( d => d.level )
          .on('click', function(d) { d.level && d3.event.stopPropagation(); foldV(d); }),
        tdBody = td.filter( d => !d.head ),
        timeData = tdBody.append('div')
          .classed('time-data', 1),
        valueData = tdBody.append('div')
          .classed('value-data', 1),
        sparcle = timeData.append('div').classed('sparcle', 1)
          .filter( d => d.byDate )
            .append('svg')
            .each( function(d){
              makeSparcle(this, d.byDate, [0, d.stat.max], timeExtent );
            } ),
        barChart = valueData.append('div').classed('barchart', 1),
        bar = barChart.append('div').classed('bar', 1)
          .style('width', function(d){
            //console.log(this.parentNode.offsetHeight , d.values.length , d.stat.max, this.parentNode.offsetHeight * d.values.length / d.stat.max)
            return this.parentNode.offsetWidth * d.values.length / d.stat.max + 'px';
          }),
        delta = timeData.append('div').classed('delta numbers', 1)
          .filter( d => d.byDate.length > 1 )
          .text( d => formatDelta(d.delta = (d.byDate[d.byDate.length-1].value - d.byDate[0].value) / d.byDate[0].value) ),
        value = valueData.append('div').classed('value numbers', 1)
          .text( d => d.values.length ),
        tdBodyTime = tdBody.filter( d => d.byDate )
          .classed('with-time', 1)
          .classed('delta-pos', d => d.delta < -0.1 )
          .classed('delta-neg', d => d.delta > 0.1);
    this.topleft = table.select('tr.level-head td.head-v').classed('topleft-cell', 1);
    tdHeadV.append('span');
    tdHeadHName.append('span');
    //console.log(type);
    if (type == 'info'){
      barChart.each(function(){ this.parentNode.appendChild(this); });
    }

    function showErrors(row){
      console.log(row.keys['ErrorType'],row);
      if (row.keys['ErrorType'] && row.values.length && self.showErrorHash != row.hash) {
        self.errorsDiv && self.errorsDiv.remove();
        var errors = row.values.map( d => d['ErrorMessage'] ),
            errorsDiv = trBody.filter( d => d.hash == row.hash ).select('td.head-v')
              //.on('mouseout', d => errorsDiv.remove() )
              .append('div').classed('error-info', true)
                .on('click', d => { d3.event.stopPropagation(); self.showErrorHash = 0; errorsDiv.remove()} );
        errorsDiv.selectAll('p').data(errors).enter().append('p')
          .html( d => d );
        console.log(console.log(errors));
        self.showErrorHash = row.hash;
        self.errorsDiv = errorsDiv;
      }
    }

    function compare(d1, d2){
      var isEqual = true;
      d3.values(d1.keys).forEach(function(key, i){
        if (key != d3.values(d2.keys)[i])
          isEqual = false;
      });
      //isEqual && console.log(d1.keys, d2.keys);
      return isEqual;
    }
    function _fold1(el, head){
      self.errorsDiv && self.errorsDiv.remove();

      var folded;
      console.log(head.level);
      if ( head.level > 0 ) {
        el.filter( d => d.level == head.level && compare(head, d) )
          .classed('folded', d => folded = d.folded = !d.folded );
        if (folded)
          el.filter( d => d.level < head.level && compare(head, d) )
            .classed('hidden', 1 ).classed('folded', d => d.folded = true )
        else {
          el.filter( d => d.level == head.level - 1 && compare(head, d) )
            .classed('hidden', 0);
        }
      }
    }
    function foldH(head){
      _fold1(td.filter( d => d.head !='v' ), head);
    }
    function foldV(head){
      _fold1(tr, head);
    }

    var folds = { h: [], v:[] };
    function _fold(el, depth, _folds){
      console.log(el, depth, _folds, _folds[depth])
      if (_folds[depth]) {
        _folds[depth] = false;
        el.filter( d=> d.depth == depth ).classed('folded', d => d.folded = false );
        el.filter( d=> d.depth == depth + 1 ).classed('hidden', 0 );
      } else {
        _folds[depth] = true;
        el.filter(d=>d.depth >= depth).classed('folded', d => d.folded = true );
        el.filter(d=>d.depth > depth).classed('hidden', true );
      }
    }
    this.fold = {};
    this.fold.h = depth => _fold(td.filter( d => d.head !='v' ), depth, folds.h);
    this.fold.v = depth => _fold(tr, depth, folds.v);


    function onSortByDelta(d){
      makeSort(d, 'delta', d => d.delta);
    }
    function onSortByValue(d){
      makeSort(d, 'value', d => d.values.length);
    }
    function makeSort(d, mode, getValue){
      self.errorsDiv && self.errorsDiv.remove();
      dash.sortColumn = d;
      var column = data[0].columns.indexOf(d);
      //console.log(i);
      dash.sortDir = d.sortDir = !d.sortDir;
      tdHeadH.selectAll('.sort-arrow').classed('enabled', 0).text('▼▲');
      d3.select( mode == 'value' ? d.thisValue : d.thisDelta ).classed('enabled', 1).text(d.sortDir ? '▼' : '▲');

      function aggsort(arr, keys, depth){
        var key = keys[depth - 1],
            children,
            agged = arr.filter( d => d3.values(d.keys).length == depth )
              .sort( (a,b) => ( getValue(b.columns[column]) - getValue(a.columns[column]) ) * ( d.sortDir * 2 - 1 ));
        agged.forEach(function(d){
          if (depth <= keys.length){
            //console.log(d);
            children = arr.filter ( dd => dd.keys[key] == d.keys[key]);
            //console.log(depth, key, arr, agged, children);
            d.children = aggsort(children, keys, depth + 1);
          }
        });
        return agged;
      }
      function order(arr, orders = []) {
        arr.forEach(function(d){
          orders.push(d.i);
          order(d.children, orders);
        });
        return orders;
      }
      var sorted = aggsort(data.filter( (d,i) => i ), _vKeys, 1),
          orders = order(sorted);
      console.log(data.map(d=>d.i),data,sorted,orders, data.filter( (d,i) => i ));
      trBody.sort( (a,b) => orders.indexOf(a.i) - orders.indexOf(b.i) );
      //console.log(sorted);

    }

    function formatDelta(delta){
      return delta ? ((delta > 0 ? '+' : '') + Math.round(100 * delta) + '%') : '';
    }
    function l2k(keys, depth){
      return d3.values(keys)[depth];
    }
    function toTitleCase(str){
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
    function keysFormat(keys, overallName){
      //console.log(overallName)
      var obj = {};
      for (var key in keys){
        obj[key] = keys[key].replace(/_/g,' ');
        if (key == 'AssociatedStandard')
          obj[key] = obj[key].replace('CCSS.ELA-', '').replace('LITERACY.', 'Literacy. ')
        else
          obj[key] = toTitleCase(obj[key]);
      }
      if (overallName){
        obj.overall = 'All ' + overallName + 's';
        //console.log(overallName)
      }
      return obj;
    }
    return this;
  }
  function isEqual(keys, datum){
    var is = true;
    for(var key in keys){
      if (datum[key] != keys[key])
        is = false;
    }
    //console.log(is, keys, datum)

    return is;
  }
  function makeSparcle(svg, data, extent, timeExtent, info){
    var parent = !info ? svg.parentNode.parentNode : svg.parentNode,
        width = parent.offsetWidth,
        height = parent.offsetHeight,
        svg = d3.select(svg),
        x = d3.scale.linear().range([1, width-1])
          .domain( timeExtent || d3.extent(data, d => d.date ) ),
        y = d3.scale.linear().range([info ? height - 20 : height - 1, 1])
          .domain( extent || d3.extent(data, d => d.value ) ),
        line = d3.svg.line().x( d => x(d.date) ).y( d => y(d.value) ),
        path = svg.attr('width', width).attr('height', height)
          .append('path').datum(data).attr('d', line);

    if (info) {
      var axis = svg.append('line')
            .attr({ x1: x(0), y1: y(0), x2: x.range()[1], y2: y(0) + 1, class: 'axis' }),
          dates = svg.selectAll('text').data(timeExtent).enter().append('text').attr({
              class: (d, i) => 'dates date-' + i,
              x: d => x(d), y: y(0), dy: '1.25em'
            }).text( d => d3.time.format('%d %b %Y')(d) );
      svg.append('line').attr({ x1: x.range()[0], y1: y(0)+1, x2: x.range()[0], y2: y(0) + 6, class: 'axis' });
      svg.append('line').attr({ x1: x.range()[1], y1: y(0)+1, x2: x.range()[1], y2: y(0) + 6, class: 'axis' });
    }
    return { path: path, y: y };
  }


  function showInfo(row){
    console.log(row);
    d3.selectAll('.dash-app div').classed('blured', 1);

    var rawDataInfo = rawData.filter( d => isEqual(row.keys, d) ),
        data1 = processData(rawDataInfo, hKeysFull, ['overall']),
        data2 = processData(rawDataInfo, fKeys, ['overall']),
        overlay = d3.select('.dash-app').append('div').classed('overlay', 1),
        close = overlay.append('div').classed('close-button',1).on('click', closeOverlay),
        // TODO title with different styles for each part
        title = overlay.append('div').classed('title', 1)
          .text(d3.values(row.keys)
                  .reduce((a, b) => (a + (a ? ' / ' : '') + (b || '')), '')
                  .replace('Overall / ','').replace('Overall', 'All ' + vName + 's')
          ),
        chartSvg = overlay.append('div').classed('chart', 1).append('svg'),
        chartData = row.columns[1],
        chart,
        tables = overlay.append('div').classed('tables-wrap', 1)
          .append('div').classed('tables', 1),
        table1 = tables.append('div').classed('info-table-wrap', 1)
          .append('table').classed('info-table-1', 1),
        table2 = tables.append('div').classed('info-table-wrap', 1)
          .append('table').classed('info-table-2', 1);
    //console.log(hKeysFull, fKeys, rawDataInfo.length,rawDataInfo,data1.length,data1, data2.length, data2 );

    if (chartData.byDate.length)
      chart = makeSparcle(chartSvg.node(), chartData.byDate, [0, chartData.stat.max], timeExtent, true );

    console.log(row, chartData, chart );

    data1.forEach( (d, i) => d.i = i );
    data2.forEach( (d, i) => d.i = i );

    var Table1 = new makeTable(table1, data1, 'info', ['overall'], hKeysFull, vName, hName);
    Table1.fold.v(0);
    Table1.topleft.text('Errors by ' + hName);
    Table1.infoKeys = row.keys;

    var Table2 = new makeTable(table2, data2, 'info', ['overall'], fKeys, vName, fName);
    Table2.fold.v(0);
    Table2.topleft.text('Errors by ' + fName);
    Table2.infoKeys = row.keys;

    function closeOverlay(){
      d3.selectAll('.dash-app *').classed('blured', 0);
      //TODO overlay show/hide animation
      overlay.remove();
    }
  }

}
