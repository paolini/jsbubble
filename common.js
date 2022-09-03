function str(x) {
    return JSON.stringify(x)
}

function round(x) { return Math.round(x*1E3)/1E3 }
        
function dump(x) {
    console.log(str(x))
}

function last(array) {
    return array[array.length - 1]
}

function array_remove(array, item) {
    for (let i=array.length; i>0;) {
        i--
        if (array[i] === item) {
            array.splice(i, 1)
        }
    }
}

function some(array, f) {
    for (let i=0; i<array.length; ++i) {
        const r = f(array[i], i, array)
        if (r) return r
    }
    return null
}

function signed_elements_add(signed_elements, sign, element) {
    for(let i=0; i<signed_elements.length; ++i) {
        if (signed_elements[i][1] === element) {
            signed_elements[i][0] += sign
            if (signed_elements[i][0] === 0) {
                signed_elements.splice(i,1)
                return 0
            }
            return signed_elements[i][0]
        }
    }
    signed_elements.push([sign, element])
    return sign
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

function find_closest_chain(chains, p) {
    let dist = Infinity
    let chain = null
    let idx = null

    chains.forEach(chain_ => {
        for(let i=1; i<chain_.vertices.length-1; ++i) {
            const v = chain_.vertices[i]
            const d = vec_distance(v, p);
            if (d < dist) {
                dist = d
                chain = chain_
                idx = i 
            }
        }
    });
    return {dist, chain, idx};
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

function path_area(signed_chains) {
    let area = 0.0
    signed_chains.forEach( ([sign, chain]) => {
            area += sign * chain.area()
    })
    return area
}

function compare_json(one, two) {
    if (Array.isArray(one)) {
        if (!Array.isArray(two)) throw new Error()
        if (one.length !== two.length) throw new Error()
        for (let i=0; i< one.length; ++i) compare_json(one[i], two[i])
    } else if (typeof(one) === 'object') {
        if (!typeof(two) === 'object') throw new Error()
        const keys = Object.keys(one).sort()
        compare_json(keys, Object.keys(two).sort())
        keys.forEach(key => compare_json(one[key], two[key]))
    } else {
        if (one !== two) throw new Error(`${one}!=${two}`)
    }
    return true
}