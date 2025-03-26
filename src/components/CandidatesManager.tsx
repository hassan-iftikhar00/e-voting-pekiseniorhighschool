// Add state for new candidate
const [newCandidate, setNewCandidate] = useState<Candidate>({
  id: "",
  name: "",
  position: "",
  imageUrl: "",
  description: "",
  class: "",
  active: true,
  displayOrder: candidates.length + 1,
});

// Add file upload state
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string>("");

// Add file upload handler
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    if (editingCandidate) {
      setEditingCandidate({
        ...editingCandidate,
        imageUrl: url,
      });
    } else {
      setNewCandidate({
        ...newCandidate,
        imageUrl: url,
      });
    }
  }
};

// Add candidate handler
const handleAddCandidate = () => {
  if (!newCandidate.name || !newCandidate.position || !newCandidate.class) {
    setNotification({
      type: "error",
      message: "Please fill in all required fields",
    });
    return;
  }

  if (!newCandidate.imageUrl) {
    setNotification({
      type: "error",
      message: "Please upload a candidate photo",
    });
    return;
  }

  const newId = (
    Math.max(...candidates.map((c) => parseInt(c.id))) + 1
  ).toString();

  setCandidates([
    ...candidates,
    {
      ...newCandidate,
      id: newId,
      displayOrder: candidates.length + 1,
    },
  ]);

  setNewCandidate({
    id: "",
    name: "",
    position: "",
    imageUrl: "",
    description: "",
    class: "",
    active: true,
    displayOrder: candidates.length + 2,
  });

  setSelectedFile(null);
  setPreviewUrl("");
  setShowAddForm(false);

  setNotification({
    type: "success",
    message: "Candidate added successfully",
  });

  setTimeout(() => setNotification(null), 3000);
};

// Update candidate handler
const handleUpdateCandidate = () => {
  if (!editingCandidate) return;

  if (
    !editingCandidate.name ||
    !editingCandidate.position ||
    !editingCandidate.class
  ) {
    setNotification({
      type: "error",
      message: "Please fill in all required fields",
    });
    return;
  }

  if (!editingCandidate.imageUrl) {
    setNotification({
      type: "error",
      message: "Please upload a candidate photo",
    });
    return;
  }

  setCandidates(
    candidates.map((candidate) =>
      candidate.id === editingCandidate.id ? editingCandidate : candidate
    )
  );

  setEditingCandidate(null);
  setSelectedFile(null);
  setPreviewUrl("");

  setNotification({
    type: "success",
    message: "Candidate updated successfully",
  });

  setTimeout(() => setNotification(null), 3000);
};

// Add form JSX
{
  (showAddForm || editingCandidate) && (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {editingCandidate ? "Edit Candidate" : "Add New Candidate"}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Image Upload */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Candidate Photo
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg overflow-hidden">
              {editingCandidate?.imageUrl || previewUrl ? (
                <img
                  src={editingCandidate?.imageUrl || previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Browse...
                </span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
              <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={editingCandidate ? editingCandidate.name : newCandidate.name}
            onChange={(e) => {
              if (editingCandidate) {
                setEditingCandidate({
                  ...editingCandidate,
                  name: e.target.value,
                });
              } else {
                setNewCandidate({ ...newCandidate, name: e.target.value });
              }
            }}
            placeholder="Enter candidate name"
          />
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Position
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={
              editingCandidate
                ? editingCandidate.position
                : newCandidate.position
            }
            onChange={(e) => {
              if (editingCandidate) {
                setEditingCandidate({
                  ...editingCandidate,
                  position: e.target.value,
                });
              } else {
                setNewCandidate({ ...newCandidate, position: e.target.value });
              }
            }}
          >
            <option value="">Select position</option>
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={
              editingCandidate ? editingCandidate.class : newCandidate.class
            }
            onChange={(e) => {
              if (editingCandidate) {
                setEditingCandidate({
                  ...editingCandidate,
                  class: e.target.value,
                });
              } else {
                setNewCandidate({ ...newCandidate, class: e.target.value });
              }
            }}
          >
            <option value="">Select class</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            value={
              editingCandidate
                ? editingCandidate.description
                : newCandidate.description
            }
            onChange={(e) => {
              if (editingCandidate) {
                setEditingCandidate({
                  ...editingCandidate,
                  description: e.target.value,
                });
              } else {
                setNewCandidate({
                  ...newCandidate,
                  description: e.target.value,
                });
              }
            }}
            placeholder="Enter candidate description"
          />
        </div>

        {/* Active Status */}
        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active-status"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={
                editingCandidate ? editingCandidate.active : newCandidate.active
              }
              onChange={(e) => {
                if (editingCandidate) {
                  setEditingCandidate({
                    ...editingCandidate,
                    active: e.target.checked,
                  });
                } else {
                  setNewCandidate({
                    ...newCandidate,
                    active: e.target.checked,
                  });
                }
              }}
            />
            <label
              htmlFor="active-status"
              className="ml-2 block text-sm text-gray-900"
            >
              Active
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Only active candidates will be available for voting.
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={() => {
            setShowAddForm(false);
            setEditingCandidate(null);
            setSelectedFile(null);
            setPreviewUrl("");
          }}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={
            editingCandidate ? handleUpdateCandidate : handleAddCandidate
          }
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {editingCandidate ? "Update" : "Add"} Candidate
        </button>
      </div>
    </div>
  );
}
