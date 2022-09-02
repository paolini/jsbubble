function str(x) {
    return JSON.stringify(x)
}

function dump(x) {
    console.log(str(x))
}

function array_remove(array, item) {
    for (let i=array.length; i>0;) {
        i--
        if (array[i] === item) {
            array.splice(i, 1)
        }
    }
}

function signed_elements_remove(array, sign, element) {
    if (!element) {
        throw new Error("element required")
    }
    for (let i=array.length; i>0;) {
        i--
        if ((array[i][0] === sign || sign ===null) && array[i][1] === element) {
            array.splice(i, 1)
        }
    }
}

function locate_path(signed_chains, start, end, sign, remove) {
    // return a signed_chains following the oriented chains
    // from start to end 
    let path = []
    // dump({signed_chains, start, end, sign})
    remove = remove || false
    if (!remove) signed_chains = signed_chains.map(x => x) // clone
    for(let v=start; v!== end;) {
        let next = null
        let i
        for (i=0;i<signed_chains.length;++i) {
            let [s, chain] = signed_chains[i]
            if (chain.node(-sign*s) === v) {
                next = chain.node(sign*s)
                // dump({ next, s, sign, chain })
                path.push([s*sign, chain])
                break
            }
        }
        if (i===signed_chains.length) return null
        signed_chains.splice(i, 1)
        if (next === start) return null
        v = next
    }
    return path
}
