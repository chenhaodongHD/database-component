class SQLUtility {
  static prepareQuery(sql: string, params: any[]) {
    let finalSQL = sql;
    const parameters: any = {};

    const m = sql.match(/\?/g);
    if (m === null) {
      return {sql, parameters};
    }
    let index = 0;
    let value = null;
    for (const m0 of m) {
      switch (typeof params[index]) {
        case 'string':
          value = `'${params[index]}'`;
          break;

        default:
          value = params[index];
          break;
      }

      if (Array.isArray(params[index])) {
        finalSQL = finalSQL.replace(m0, `:...value${index}`);
        parameters[`value${index}`] = params[index];
      } else {
        finalSQL = finalSQL.replace(m0, `:value${index}`);
        parameters[`value${index}`] = params[index];
      }
      index++;
    }

    return {
      sql: finalSQL,
      parameters,
    };
  };
}

export {SQLUtility}
