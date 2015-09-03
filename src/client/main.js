
function main() {
    makeMenu();
    var expand = getParameterByName('expand') === 'true';


    var courses = document.querySelectorAll('.course');
    Array.prototype.forEach.call(courses, function(courseEl) {

            courseEl.classList.add('active');
            var tooltip = new Opentip(courseEl, {
                target: courseEl,
                // title: courseNumber,
                group: 'course',
                showEffect: '',
                hideEffect: ''
            });

            var course = JSON.parse(courseEl.dataset.course);

            course.Terms.forEach(function(term) {
                term = term.split(' ').join('-');
                courseEl.classList.add('term-' + term);
            });

            if (expand) {
                courseEl.innerText += ' (' + course.title + ')';
            }

            // TODO: use a template
            var content = '';
            content += '<div class="c-title">' + course.number + ': ' + course.title + '</div>';
            content += '<div class="c-terms">Terms: ' + course.Terms.join(', ') + '</div>';

            tooltip.setContent(content);
    });
}

function makeMenu() {
    var container = document.createElement('div');

    container.classList.add('controls');
    container.style.position = 'fixed';
    container.style.right = '0';
    container.style.top = '200px';
    container.style.backgroundColor = '#dedede';
    container.style.padding = '10px';
    container.style.border = '1px solid #777';
    container.style.borderRight = 'none';
    container.style.borderRadius = '10px';
    container.style.borderTopRightRadius = '0';
    container.style.borderBottomRightRadius = '0';

    var controlsToRender = [
        {
            label: 'Bold',
            bodyClass: 'bold-enabled',
            default: true
        },
        {
            label: 'Underline',
            bodyClass: 'underline-enabled'
        },
        {
            label: 'Highlight Aut',
            bodyClass: 'highlight-Aut',
            class: 'control-Aut'
        },
        {
            label: 'Highlight Win',
            bodyClass: 'highlight-Win',
            class: 'control-Win'
        },
        {
            label: 'Highlight Spr',
            bodyClass: 'highlight-Spr',
            class: 'control-Spr'
        }
    ];

    var manageControlClasses = function() {
        $(container).find('input[type="checkbox"]').each(function() {
            var bodyClass = this.dataset.bodyClass;
            if (this.checked) {
                document.body.classList.add(bodyClass);
            } else {
                document.body.classList.remove(bodyClass);
            }
        });
    };

    controlsToRender.forEach(function(controlToRender) {
        var controlContainer = document.createElement('label');
        controlContainer.style.display = 'block';
        controlContainer.style.padding = '4px';
        if ('class' in controlToRender) {
            controlContainer.classList.add(controlToRender['class']);
        }
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        if (controlToRender.default) {
            checkbox.checked = true;
        }
        checkbox.addEventListener('change', manageControlClasses);
        checkbox.dataset.bodyClass = controlToRender.bodyClass;
        controlContainer.appendChild(checkbox);
        var label = document.createElement('span');
        label.innerText = controlToRender.label;
        controlContainer.appendChild(label);
        container.appendChild(controlContainer);
    });

    document.body.appendChild(container);
    manageControlClasses();
}

// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

main();
