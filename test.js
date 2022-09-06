/**
 * Copyright 2021, 2022 Emanuele Paolini (emanuele.paolini@unipi.it)
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 **/

function test(main) {
    const save = Math.random
    Math.random = () => 0.5 // reproducible results
    main.options.draw_ids = true
    main.options.fill_regions = true
    main.cluster.ds=0.5
    main.cluster.dt=0.2
    main.command_reset()
    main.command_draw(new Vertex(-0.16666641235351554,0.9656249523162841))
    main.command_draw(new Vertex(-0.7833332061767577,1.340624952316284))
    main.command_draw(new Vertex(-1.4249999999999998,1.4822915554046632))
    main.command_draw(new Vertex(-2.075,1.5239583492279052))
    main.command_draw(new Vertex(-2.641666603088379,1.4739583492279054))
    main.command_draw(new Vertex(-3.2333333015441896,1.3156249523162842))
    main.command_draw(new Vertex(-3.6916666507720945,1.0406249523162843))
    main.command_draw(new Vertex(-3.9333333313465118,0.5906249523162841))
    main.command_draw(new Vertex(-3.8833333253860474,0.023958349227905185))
    main.command_draw(new Vertex(-3.675,-0.4593752384185792))
    main.command_draw(new Vertex(-3.2666666507720947,-0.8093752384185793))
    main.command_draw(new Vertex(-2.7083333015441893,-0.9177084445953367))
    main.command_draw(new Vertex(-2.133333206176758,-0.8760416507720947))
    main.command_draw(new Vertex(-1.6333332061767578,-0.8177084445953371))
    main.command_draw(new Vertex(-1.1,-0.6843752384185793))
    main.command_draw(new Vertex(-0.7333332061767579,-0.259375238418579))
    main.command_draw(new Vertex(-0.6666664123535155,0.3406247615814211))
    main.command_draw(new Vertex(-0.6583332061767577,0.8406249523162841))
    main.command_draw(null)
    main.command_draw(new Vertex(0.09166679382324183,0.907291555404663))
    main.command_draw(new Vertex(0.4916667938232422,0.5989583492279054))
    main.command_draw(new Vertex(0.708333587646484,0.10729155540466317))
    main.command_draw(new Vertex(0.7333335876464844,-0.4927084445953369))
    main.command_draw(new Vertex(0.5999999999999996,-0.9927084445953369))
    main.command_draw(new Vertex(0.25833358764648473,-1.401041650772095))
    main.command_draw(new Vertex(-0.25,-1.442708444595337))
    main.command_draw(new Vertex(-0.7416664123535157,-1.3343752384185787))
    main.command_draw(null)
    main.command_draw(new Vertex(-2.025,1.340624952316284))
    main.command_draw(new Vertex(-2.083333206176758,0.7989583492279051))
    main.command_draw(new Vertex(-2.091666603088379,0.2739583492279052))
    main.command_draw(new Vertex(-2.133333206176758,-0.259375238418579))
    main.command_draw(null)
    main.command_draw(new Vertex(-1.8250000000000002,0.2739583492279052))
    main.command_draw(new Vertex(-1.316666603088379,0.22395834922790536))
    main.command_draw(new Vertex(-0.8083332061767576,0.22395834922790536))
    main.command_draw(null)
    main.command_draw(new Vertex(-2.45,0.34895834922790536))
    main.command_draw(new Vertex(-2.975,0.47395834922790536))
    main.command_draw(new Vertex(-3.491666650772095,0.45729155540466326))
    main.command_draw(null)
    main.command_collapse(main.chain(7)) // 7 // 4
    main.command_remove(main.chain(10),main.region(-1)) // 10 // 5
    main.command_flip(main.chain(13)) // 13 // 6
    main.command_collapse(main.chain(13)) 

    main.command_check({"nodes":[[10,-3.675,-3.675],[11,-3.267,-3.267],[12,-2.708,-2.708],[14,-1.633,-1.633],[19,-0.167,-0.167],[2,-0.783,-0.783],[22,0.492,0.492],[23,0.708,0.708],[24,0.733,0.733],[25,0.6,0.6],[26,0.258,0.258],[27,-0.25,-0.25],[3,-1.425,-1.425],[31,-0.667,-0.667],[32,-1.1,-1.1],[40,-2.133,-2.133],[5,-2.642,-2.642],[54,-3.933,-3.933],[55,-2.092,-2.092],[6,-3.233,-3.233],[7,-3.692,-3.692],[9,-3.883,-3.883]],"chains":[[1,55,31],[2,31,22,23,24,25,26,27,32],[3,40,14,32],[4,55,40],[5,31,19,2,3,55],[9,32,55],[14,40,12,11,10,9,54,7,6,5,55]],"regions":[[1,3.697,[-4,-14]],[2,2.58,[-1,-2,-9]],[3,2.096,[1,5]],[4,1.167,[4,3,9]]]})
    
    main.command_step(1)
    
    main.command_check({"nodes":[[0,-2.308,-2.308],[10,-2.075,-2.075],[11,-1.667,-1.667],[12,-1.108,-1.108],[14,-0.033,-0.033],[19,1.433,1.433],[2,0.817,0.817],[22,2.092,2.092],[23,2.308,2.308],[24,2.333,2.333],[25,2.2,2.2],[26,1.858,1.858],[27,1.35,1.35],[3,0.175,0.175],[31,1.011,1.011],[32,0.275,0.275],[40,-0.544,-0.544],[5,-1.042,-1.042],[54,-2.333,-2.333],[55,-0.025,-0.025],[6,-1.633,-1.633],[7,-2.092,-2.092],[9,-2.283,-2.283]],"chains":[[1,55,0,31],[2,31,22,23,24,0,25,26,27,32],[3,40,0,14,32],[4,55,0,40],[5,31,19,0,2,3,55],[9,32,0,55],[14,40,12,11,10,9,0,54,7,6,5,55]],"regions":[[1,3.697,[-4,-14]],[2,2.58,[-1,-2,-9]],[3,2.096,[1,5]],[4,1.167,[4,3,9]]]})

    Math.random = save
    console.log("test passed!")
}