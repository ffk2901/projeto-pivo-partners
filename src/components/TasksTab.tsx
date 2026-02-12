"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Task, TeamMember, Startup } from "@/types";
import Modal from "./Modal";
import TaskForm from "./TaskForm";

interface Props {
  startupId: string;
  tasks: Task[];
  team: TeamMember[];
  startups: Startup[];
  onRefresh: () => void;
}

type View = "byPerson" | "list";

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-500",
};

export default function TasksTab({
  startupId,
  tasks,
  team,
  startups,
  onRefresh,
}: Props) {
  const [view, setView] = useState<View>("byPerson");
  const [showAdd, setShowAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const today = new Date().toISOString().split("T")[0];

  const filteredTasks =
    filterStatus === "all"
      ? tasks
      : tasks.filter((t) => t.status === filterStatus);

  const handleCreate = async (data: Partial<Task>) => {
    await api().createTask({ ...data, startup_id: startupId });
    setShowAdd(false);
    onRefresh();
  };

  const handleUpdate = async (data: Partial<Task>) => {
    await api().updateTask(data);
    setEditingTask(null);
    onRefresh();
  };

  const handleToggle = async (task: Task) => {
    await api().updateTask({
      task_id: task.task_id,
      status: task.status === "done" ? "todo" : "done",
    });
    onRefresh();
  };

  const getOwnerName = (id: string) =>
    team.find((m) => m.team_id === id)?.name || "Unassigned";

  const renderTaskCard = (task: Task) => (
    <div
      key={task.task_id}
      className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => handleToggle(task)}
          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
            task.status === "done"
              ? "border-blue-500 bg-blue-500"
              : "border-gray-300 hover:border-blue-500"
          }`}
        >
          {task.status === "done" && (
            <span className="text-white text-xs">&#10003;</span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p
              className={`text-sm leading-snug ${
                task.status === "done"
                  ? "text-gray-400 line-through"
                  : "text-gray-800"
              }`}
            >
              {task.title}
            </p>
            <button
              onClick={() => setEditingTask(task)}
              className="text-gray-300 hover:text-gray-500 text-xs ml-2 flex-shrink-0"
            >
              edit
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.due_date && (
              <span
                className={`text-xs ${
                  task.due_date < today && task.status !== "done"
                    ? "text-red-500 font-medium"
                    : "text-gray-400"
                }`}
              >
                {task.due_date}
              </span>
            )}
            {task.priority && task.priority !== "medium" && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  PRIORITY_COLORS[task.priority]
                }`}
              >
                {task.priority}
              </span>
            )}
            {task.status === "doing" && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                in progress
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button
              onClick={() => setView("byPerson")}
              className={`px-2.5 py-1 text-xs rounded ${
                view === "byPerson"
                  ? "bg-gray-200 text-gray-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              By Person
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-2.5 py-1 text-xs rounded ${
                view === "list"
                  ? "bg-gray-200 text-gray-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              List
            </button>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="todo">To Do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Task
        </button>
      </div>

      {view === "byPerson" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((member) => {
            const memberTasks = filteredTasks
              .filter((t) => t.owner_id === member.team_id)
              .sort((a, b) =>
                (a.due_date || "9999").localeCompare(b.due_date || "9999")
              );
            return (
              <div key={member.team_id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700">
                    {member.name}
                  </h4>
                  <span className="text-xs text-gray-400">
                    ({memberTasks.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {memberTasks.length === 0 && (
                    <p className="text-xs text-gray-300 py-2">No tasks</p>
                  )}
                  {memberTasks.map(renderTaskCard)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {filteredTasks
            .sort((a, b) =>
              (a.due_date || "9999").localeCompare(b.due_date || "9999")
            )
            .map((task) => (
              <div key={task.task_id} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                  {getOwnerName(task.owner_id)}
                </span>
                <div className="flex-1">{renderTaskCard(task)}</div>
              </div>
            ))}
          {filteredTasks.length === 0 && (
            <p className="text-xs text-gray-400">No tasks match the filter.</p>
          )}
        </div>
      )}

      {/* Add task */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Task"
      >
        <TaskForm
          team={team}
          startups={startups}
          initial={{ startup_id: startupId }}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {/* Edit task */}
      <Modal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        {editingTask && (
          <TaskForm
            team={team}
            startups={startups}
            initial={editingTask}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Modal>
    </div>
  );
}
