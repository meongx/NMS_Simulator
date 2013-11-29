function findBy(collection, property, value) {
	return ko.utils.arrayFirst(collection, function(item) {
		return item[property] == value;
	})
}
function findById(collection, idValue) {
	return findBy(collection, 'id', idValue);
}
function updateLink(node, newLink) {
	vm.links.remove(function(link) {
		return link.source.id == node.linkVia && link.target.id == node.id
	})
	
	vm.selectedNode().linkVia = newLink;
	if (!newLink) return;

	vm.links.push({
		source: findById(vm.nodes(), newLink),
		target: node
	})
}
function toggleClass(element, value, className) {
	if (value)
		element.classList.add(className);
	else
		element.classList.remove(className);
}
function poll() {
	l('poll');
	var root = vm.nodes()[0];
	var recurse = function(node, linkIsUp) {
		var nodeEl = document.getElementById('node-'+node.id);

		node.isUp(linkIsUp && node.isOn());
		toggleClass(nodeEl, node.isUp(), 'up');

		var linked = vm.nodes().filter(function(n) { return n.linkVia == node.id });
		//l('recurse-filter',linked.length, linked);
		if (!linked.length) return;

		linked.forEach(function(n) {
			setTimeout(function() {
				recurse(n, node.isUp())
			}, 500)
		});
	}
	recurse(root, root.isOn());
}
function l() { console.log(arguments); window.d = arguments[arguments.length-1] }

window.vm = {};
vm.selectedNode = ko.observable();
vm.linkUpdate = ko.observable();

vm.selectedNode.subscribe(function(value) {
	if (value) vm.linkUpdate(value.linkVia);
});
vm.linkUpdate.subscribe(function(value) {
	var currentLink = vm.selectedNode().linkVia;
	if (value == currentLink) return;

	updateLink(vm.selectedNode(), value);
});

vm.newId = ko.observable();
vm.newLink = ko.observable();

vm.pollerTime = ko.observable(5);
vm.pollerAuto = ko.observable(false);

var checkAutoPoller = function() {
	var isEnabled = vm.pollerAuto(),
		intervalSec = vm.pollerTime();

	if (window.pollerThread)
		clearInterval(window.pollerThread);

	if (isEnabled)
		window.pollerThread = setInterval(poll, intervalSec * 1000)
}

vm.pollerAuto.subscribe(checkAutoPoller);
vm.pollerTime.subscribe(checkAutoPoller);

vm.nodes = ko.observableArray();
vm.links = ko.observableArray();

var width = document.body.clientWidth,
	height = window.innerHeight - 200;

//var svg = d3.select('body').insert('svg',':nth-child(1)')
var svg = d3.select('#monitor').append('svg')
	.attr('width', width)
	.attr('height', height)
	.on('click', function() {
		var target = d3.event.target;

		var clearPreviousSelection = function() {
			if (!vm.selectedNode()) return;
			var circle = document.getElementById('node-'+vm.selectedNode().id);
			circle.classList.remove('selected');
		}

		if (target.tagName == 'circle') {
			var nodeId = target.id.substring(5),
				node = findById(vm.nodes(), nodeId);

			clearPreviousSelection();
			vm.selectedNode(node);
			target.classList.add('selected');
		}
		else if (vm.selectedNode()) {
			clearPreviousSelection();
			vm.selectedNode(undefined);
		}
	});

var svgNodes = svg.selectAll('.node'),
	svgLinks = svg.append('g').selectAll('.link');


var onTick = function() {
	/*svgNodes.attr("cx", function(d) { return d.x; })
    		.attr("cy", function(d) { return d.y; });*/
    svgNodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

	svgLinks.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });
}

var force = d3.layout.force()
	.nodes(vm.nodes())
	.links(vm.links())
	.gravity(.05)
	//.distance(100)
	.linkDistance(60)
	.charge(-400)
	.size([width, height])
	.on('tick', onTick);

vm.update = function() {
	svgLinks = svgLinks.data(force.links(), function(d) { return d.target.id + '-' + d.target.id });
	svgLinks.enter().insert('line', '.node')
		.attr('class', 'link')
		.attr('id', function(d) { return 'link-' + d.target.id });
	svgLinks.exit().remove();

	svgNodes = svgNodes.data(force.nodes(), function(d) { return d.id });
	var group = svgNodes.enter().append('g');
	group.append('circle')
		.attr('r',7)
		.attr('id', function(d) { return 'node-' + d.id })
		.call(force.drag);
	group.append('text')
		.attr('dx',12)
		.attr('dy','.35em')
		.text(function(d) { return d.id });
	svgNodes.exit().remove();


	force.start();
}

vm.newNode = function(context, event) {
	l('newNode', arguments)
	var exists = findById(vm.nodes(), context.newId());
	if (exists) {
		alert("ID Perangkat tidak boleh sama!");
		return;
	}

	var linkSource = context.newLink();
	var newNode = {
		id: context.newId(),
		linkVia: linkSource,
		isUp: ko.observable(true),
		isOn: ko.observable(true)
	};
	context.nodes.push(newNode);

	if (!linkSource) return;

	var newLink = {
		//source: context.findNodeById(context.newLink()),
		source: findById(context.nodes(), linkSource),
		target: newNode
	}
	context.links.push(newLink);
}
vm.removeNode = function(context, event) {
	l('removeNode', arguments)
	var currentNode = vm.selectedNode();
	vm.links.remove(function(link) { 
		return link.target.id == currentNode.id || link.source.id == currentNode.id
	});
	vm.nodes.remove(function(node) { return node.id == currentNode.id });
	vm.selectedNode(undefined);
}

vm.nodes.subscribe(vm.update);
vm.links.subscribe(vm.update);

ko.applyBindings(window.vm);
document.getElementById('poll-now').addEventListener('click', poll, false);

vm.newId('Sentral');
vm.newLink('');
vm.newNode(vm);

/*vm.newId('1');
vm.newLink('Udel');
vm.newNode(vm);

vm.newId('2');
vm.newLink('Udel');
vm.newNode(vm);

vm.newId('1.1');
vm.newLink('1');
vm.newNode(vm);

vm.newId('1.2');
vm.newLink('1');
vm.newNode(vm);

vm.newId('2.1');
vm.newLink('2');
vm.newNode(vm);

vm.newId('2.2');
vm.newLink('2');
vm.newNode(vm);
*/