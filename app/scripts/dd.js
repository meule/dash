var DD = {

  hashKeys: function(obj, keys){
    if (keys && keys.length)
      return keys.reduce((a, b) => ('' + a + (obj[b] || '')), '');
    var h = '';
    for (var k in obj)
      h += obj[k];
    return h;
  },

  filterByKey: function(obj, keys){
    if (typeof keys == 'string')
      keys = [keys];
    var newObj = {};
    keys.forEach( key => newObj[key] = obj[key] );
    return newObj;
  },

  _agg: function(arr, keys, isIDs){
    if (typeof keys == 'string')
      keys = [keys];
    var map = {};
    //console.log(keys)
    arr.forEach(function(d, i){
      var hash = DD.hashKeys(d, keys);
      if (isIDs) {
        if (!map[hash])
          map[hash] = { keys: DD.filterByKey(d, keys), ids: [] };
        map[hash].ids.push(i);
      } else {
        if (!map[hash])
          map[hash] = { keys: DD.filterByKey(d, keys), values: [] };
        map[hash].values.push(d);
      };
    });
    //console.log(map,d3.values(map));
    return d3.values(map);
  },

  aggIDs: function(arr, keys){
    return DD._agg(arr, keys, true);
  },

  agg: function(arr, keys){
    return DD._agg(arr, keys);
  },

  treeKeys: function(arr, keys){
    if (typeof keys == 'string')
      keys = [keys];
    var map = {},
        _map = map;

    arr.forEach(function(d){
      _map = map;
      keys.forEach(function(key){
        if (!_map[d[key]]) {
          _map[d[key]] = {};
          //res0.push({ key: key, value: d[key], children: [] });
        }
        _map = _map[d[key]];
      });
    });
    //console.log(map);
    return map;
  },
  sortBy: function(arr, key){
    arr.sort(function(a,b){
      if ( a[key] < b[key] )
        return -1
      else {
        return 1;
      }
    });
  },

  _tree: function(arr, keys, isIDs){
    if (typeof keys == 'string')
      keys = [keys];
    var res = [],
        _keys = [];

    keys.forEach(function(key){
      _keys.push(key);
      if (isIDs){
        res = res.concat(DD.aggIDs(arr, _keys))
      }
      else
        res = res.concat(DD.agg(arr, _keys));
    });

    //console.log(res);

    res.forEach( function(d){
      d.hash = DD.hashKeys(d.keys, keys);
      d.level = keys.length - d3.keys(d.keys).length;
      d.depth = d3.keys(d.keys).length - 1;
    } );
    DD.sortBy(res, 'hash');
    //console.log(res, res.map( d => d.hash));
    return res;
  },

  tree: (arr, keys) => DD._tree(arr, keys),

  treeIDs: (arr, keys) => DD._tree(arr, keys, true),

  tree2: function (arr, keys1, keys2) {
    var hashes = {};
    if (typeof keys1 == 'string')
      keys1 = [keys1];
    if (typeof keys2 == 'string')
      keys2 = [keys2];
    var rows = DD.tree(arr, keys1);
    rows.forEach(function(d){
      d.columns = DD.tree(d.values, keys2);
      d.columns.forEach( dd => hashes[dd.hash] = dd.keys );
    });
    rows.forEach(function(d){
      for (var h in hashes) {
        //console.log(d.columns.map(dd=>d.hash), h, d.columns.find( dd => dd.hash == h ))
        if (!d.columns.find( dd => dd.hash == h )){
          d.columns.push({
            hash: h,
            keys: hashes[h],
            values: [],
            level: keys2.length - d3.keys(hashes[h]).length,
            depth: d3.keys(hashes[h]).length - 1
          });
        }
      }
      DD.sortBy(d.columns, 'hash');
    });
    return rows;
  },

  calcStat: function(table){
    var stat = [];
    table.forEach(function(row){
      row.columns.forEach(function(cell){
        var val = cell.values.length,
            cellStat;
        if (!stat[row.level])
          stat[row.level] = [];
        if (!stat[row.level][cell.level])
          stat[row.level][cell.level] = { min: 1000000, max: 0 };
        cellStat = stat[row.level][cell.level];
        stat[row.level][cell.level] = { min: Math.min(cellStat.min, val), max: Math.max(cellStat.max, val) };
      });
    });
    table.forEach(function(row){
      row.columns.forEach( cell => cell.stat = stat[row.level][cell.level] );
    });
  },

  byDate: function(table, dateField = '_date' ){
    table.forEach(function(row, i){
      row.columns.forEach(function(cell, k){
        //if (!i) row.columns[k].withDate = true;
        cell.byDate = DD.tree(cell.values, ['date']).map( d => ({ date: d.values[0][dateField], value: d.values.length }) );
      });
    });
  },

  addHeads: function(table){
    table.unshift({
      columns: table[0].columns.map( d => ({ keys: d.keys, level: d.level, depth: d.depth, head: 'h' }) ),
      head: 'h'
    });
    table.forEach(function(row){
      row.columns.unshift({ keys: row.keys, level: row.level, depth: row.depth, head: 'v' })
    });
    table[0].columns.forEach(function(cell, i){
      cell.withDate = table.map( d => d.columns[i].byDate && d.columns[i].byDate.length > 0 ).find( d => d );
    });
  }

}
