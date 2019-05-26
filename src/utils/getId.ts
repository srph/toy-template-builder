getId.counter = 0

function getId() {
  return ++getId.counter  
}

export default getId