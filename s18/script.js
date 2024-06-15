async function getSolveCountsOfContestById(id) {
    const response = await fetch(`https://vjudge.net/contest/rank/single/${id}`)
	const json_response = await response.json();
	const submissions_info = json_response['submissions'];
	const participants_info = json_response['participants'];
	const userid_to_handle = {};
	for (let i in participants_info) {
		userid_to_handle[i] = participants_info[i][0].toLocaleLowerCase();
	}
	const participant_solved_problems = {};
	for (let i in submissions_info) {
		const problemId = submissions_info[i][1],
			user_id = userid_to_handle[submissions_info[i][0]],
			verdict = submissions_info[i][2];
		if (!participant_solved_problems.hasOwnProperty(user_id)) {
			participant_solved_problems[user_id] = new Set();
		}
		if (verdict == 1) {
			participant_solved_problems[user_id].add(problemId);
		}
	}
	return participant_solved_problems;
}
const table = document.querySelector('table');
function getColor(percent) {
	percent = Math.min(100, Math.max(0, percent));
	var red = percent < 50 ? 255 : Math.round(255 - (percent - 50) * 5.1);
	var green = percent > 50 ? 255 : Math.round((percent * 5.1));
	var color = 'rgb(' + red + ',' + green + ', 0)';
	return color;
}

function getColorMatte(percent) {
	percent = Math.min(100, Math.max(0, percent));
	var red = percent < 50 ? 255 : Math.round(255 - (percent - 50) * 5.1);
	var green = percent > 50 ? 255 : Math.round((percent * 5.1));
	var color = 'rgba(' + red + ',' + green + ',0, 0.3)';
	return color;
}

const lowerCaseHandle_to_Original = {};
for (handle in participants_names) {
	lowerCaseHandle_to_Original[handle.toLocaleLowerCase()] = handle;
}


function addDataToTable(entries) {
    let totalWeightedProblemCount = 0;
    let totalProblemCount = 0;
    for (let i in contests) {
        totalWeightedProblemCount += contests[i][1] * contests[i][2];  
        totalProblemCount += contests[i][1];
    }

    const tbody = document.createElement('tbody');
    const head_row = document.createElement('tr');
    const rankCol = document.createElement('td');
    rankCol.textContent = 'Rank';
    head_row.appendChild(rankCol);

    const nameCol = document.createElement('td');
    nameCol.textContent = 'Participants';
    head_row.appendChild(nameCol);

    const totSolCol = document.createElement('td');
    totSolCol.textContent = `Solved (${totalProblemCount.toFixed(0)})`;
    head_row.appendChild(totSolCol);

    if (ELIGIBILITY.require) {
        const elCol = document.createElement('td');
        elCol.textContent = `${ELIGIBILITY.target}%`;
        elCol.classList.add('eligibility-col');
        head_row.appendChild(elCol);
    }

    for (let i in contests) {
        const th = document.createElement('td');
        th.style.color = 'blue';
        const contestHyperLink = document.createElement('a');
        contestHyperLink.href = `https://vjudge.net/contest/${i}`;
        contestHyperLink.target = '_blank';
        contestHyperLink.textContent = `${contests[i][0]} (${contests[i][1]})`;
        th.appendChild(contestHyperLink);
        head_row.appendChild(th);
    }
    tbody.appendChild(head_row);

    let participant_rank = 1;
    
    for (let i in entries) {
        const user = entries[i][0];
        const tr = document.createElement('tr');
        const rank = document.createElement('td');
        rank.textContent = `${participant_rank++}`;
        tr.appendChild(rank);
        
        const totalWeightedSolves = entries[i][1].totalWeightedSolves;
        const totalSolved = entries[i][1].totalSolved;
        const p = Math.round((totalWeightedSolves * 100) / totalWeightedProblemCount);

        const participantName = document.createElement('td');
        const participant = document.createElement('div');
        participant.classList.add('participant');
        const name = document.createElement('p');
        name.classList.add('participant-name');
        name.textContent = `${participants_names[lowerCaseHandle_to_Original[user]]} `;
        participant.appendChild(name);
        const handle = document.createElement('a');
        handle.classList.add('participant-handle');
        handle.href = `https://vjudge.net/user/${lowerCaseHandle_to_Original[user]}`;
        handle.textContent = `${lowerCaseHandle_to_Original[user]}`;
        handle.target = '_blank';
        participant.appendChild(handle);
        participantName.appendChild(participant);
        tr.appendChild(participantName);

        const totSolved = document.createElement('td');
        totSolved.innerHTML = `${totalSolved.toFixed(0)} [ <strong>${p}% </strong>]`;
        totSolved.style.backgroundColor = getColor(p);
        tr.appendChild(totSolved);

        if (ELIGIBILITY.require) {
            const eligible = document.createElement('td');
            eligible.classList.add('eligibility-col');
            if (p >= ELIGIBILITY.target) {
                eligible.innerHTML = `<i class="fa-solid fa-square-check"></i>`;
                eligible.style.color = 'green';
            } else {
                eligible.innerHTML = `<i class="fa-solid fa-square-xmark"></i>`;
                eligible.style.color = 'red';
            }
            tr.appendChild(eligible);
        }

        const user_contest = entries[i][1];
        for (let c in contests) {
            let solvecnt = 0;
            const td = document.createElement('td');
            if (user_contest.hasOwnProperty(c)) {
                solvecnt = user_contest[c];
                if (solvecnt == contests[c][1]) {
                    td.innerHTML = `<i class="fa-solid fa-check fa-lg"></i>`;
                } else {
                    td.innerHTML = `${solvecnt}`;
                }
            } else {
                td.textContent = ' ';
            }
            td.style.backgroundColor = getColorMatte((solvecnt * 100) / (contests[c][1]));
            tr.appendChild(td);
        }

        if (ELIMINATION.active && p < ELIMINATION.target) {
            tr.classList.add('eliminated');
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
}


async function run_it() {
    const temp_table = {};
    for (let i in lowerCaseHandle_to_Original) {
        temp_table[i] = {totalSolved :0 ,totalWeightedSolves: 0, totalWeightedAvailable: 0};
    }

    const solveCountPromises = Object.entries(contests).map(async ([contestId, contest]) => {
        const solveCount = await getSolveCountsOfContestById(contestId);
        return { contestId, solveCount, weight: contest[2] };
    });

    const solveCountResults = await Promise.all(solveCountPromises);

    for (const result of solveCountResults) {
        const { contestId, solveCount, weight } = result;
        for (let handle in solveCount) {
            if (lowerCaseHandle_to_Original.hasOwnProperty(handle)) {
                const problemsSolved = solveCount[handle].size;
                temp_table[handle][contestId] = problemsSolved;
                temp_table[handle].totalSolved += problemsSolved;
                temp_table[handle].totalWeightedSolves += problemsSolved * weight;
                temp_table[handle].totalWeightedAvailable += contests[contestId][1] * weight;
            }
        }
    }

    const entries = Object.entries(temp_table);
    entries.sort((a, b) => b[1].totalWeightedSolves - a[1].totalWeightedSolves);
    addDataToTable(entries);
}
  

run_it();