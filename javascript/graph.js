class Node {
    constructor(id, properties) {
        this.id = id;
        this.properties = properties;
        this.observers = [];
    }
    
}


let graph = {
    adj_list: {},
    observers: {},

    addVertex: function(v) {
        this.adj_list[v] = [];
    },

    addEdge: function(v, w) {
        this.adj_list[v].push(w);
        this.adj_list[w].push(v);
    },
    
    addObserver: function(v, observer, observer_id) {
        this.observers[v].push({"observer": observer, "id": observer_id});
    },

    executeObservers: function(v) {
        this.observers[v].forEach(observer => observer.observer(v));
    },

    removeObserver: function(v, observer_id) {
        this.observers[v] = this.observers[v].filter(o => o.id !== observer_id);
    },
}