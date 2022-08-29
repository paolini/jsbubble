function array_remove(array, item) {
    for (let i=array.length; i>0;) {
        i--
        if (array[i] === item) {
            array.splice(i, 1)
        }
    }
}