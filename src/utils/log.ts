function log<T = any>(item: T): T {
  return console.log(item), item
}

export default log