function test(main) {
    main.cluster.ds=0.1
    main.cluster.dt=0.2
    main.command_reset()
    main.cluster.ds=0.5
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
    main.command_collapse(new Vertex(-2.0583332061767576,0.5406249523162843))
    main.command_remove(new Vertex(-2.925,0.3989583492279052))
    main.command_flip(new Vertex(-2.191666603088379,0.8239583492279055))
    main.command_collapse(new Vertex(-2.141666603088379,0.8406249523162841))
    main.command_check({
            "nodes": [[-0.667,-0.667],[-1.1,-1.1],[-2.133,-2.133],[-2.092,-2.092]],
            "chains": [
                {"start":3,"end":0,"vertices":[]},
                {"start":0,"end":1,"vertices":[[0.492,0.599],[0.708,0.107],[0.733,-0.493],[0.6,-0.993],[0.258,-1.401],[-0.25,-1.443]]},
                {"start":2,"end":1,"vertices":[[-1.633,-0.818]]},
                {"start":3,"end":2,"vertices":[]},
                {"start":0,"end":3,"vertices":[[-0.167,0.966],[-0.783,1.341],[-1.425,1.482]]},
                {"start":1,"end":3,"vertices":[]},
                {"start":2,"end":3,"vertices":[[-2.708,-0.918],[-3.267,-0.809],[-3.675,-0.459],[-3.883,0.024],[-3.933,0.591],[-3.692,1.041],[-3.233,1.316],[-2.642,1.474]]}],
            "regions":[
                {"area_target":3.697,"chains":[-4,-7]},
                {"area_target":2.58,"chains":[-1,-2,-6]},
                {"area_target":2.096,"chains":[1,5]},
                {"area_target":1.167,"chains":[4,3,6]}]})
    console.log("test passed!")
}