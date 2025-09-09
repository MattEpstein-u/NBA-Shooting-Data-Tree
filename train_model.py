import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report
import json
from sklearn.tree import _tree

# Load the dataset
try:
    df = pd.read_csv('nba25per36.csv')
except FileNotFoundError:
    print("Error: 'nba25per36.csv' not found. Make sure the file is in the correct directory.")
    exit()

# Handle missing values in the target variable 'Pos' before splitting
df.dropna(subset=['Pos'], inplace=True)

# Keep player names for later use
player_names = df['Player']

# Drop non-numeric columns that won't be used in the model, and the target variable 'Pos'
# Also dropping columns that are not direct player stats or are identifiers.
features = df.drop(columns=['Rk', 'Player', 'Team', 'Pos', 'Awards', 'Player-additional'])

# The target variable is 'Pos'
target = df['Pos']

# Handle potential missing values in the features.
# For simplicity, we'll fill NaN values with 0. This is a common approach for stats
# where a NaN might represent 0 attempts (e.g., 3P%).
features = features.fillna(0)

# Convert all feature columns to numeric, coercing errors
for col in features.columns:
    features[col] = pd.to_numeric(features[col], errors='coerce')

# After coercion, there might be new NaNs if some values couldn't be converted.
# We'll fill them with 0 as well.
features = features.fillna(0)


# Split the data into training and testing sets (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(features, target, test_size=0.2, random_state=42, stratify=target)

# Initialize the Decision Tree Classifier
# We use a random_state for reproducibility of the results.
clf = DecisionTreeClassifier(max_depth=5, random_state=42)

# Train the classifier on the training data
clf.fit(X_train, y_train)

# Make predictions on the test data
y_pred = clf.predict(X_test)

# Evaluate the model's performance
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy:.2f}")

# Print a more detailed classification report
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# To show an example of the prediction
print("\nExample Prediction:")
# We take the first row of the test set
sample_player_features = X_test.iloc[0]
sample_player_actual_pos = y_test.iloc[0]
sample_player_predicted_pos = clf.predict([sample_player_features])[0]

print(f"  Features: {sample_player_features.to_dict()}")
print(f"  Actual Position: {sample_player_actual_pos}")
print(f"  Predicted Position: {sample_player_predicted_pos}")


# --- Export the tree to JSON ---
def tree_to_dict(tree, feature_names, class_names):
    tree_ = tree.tree_
    feature_name = [
        feature_names[i] if i != _tree.TREE_UNDEFINED else "undefined!"
        for i in tree_.feature
    ]
    
    def recurse(node_id):
        if tree_.feature[node_id] != _tree.TREE_UNDEFINED:
            # It's a decision node
            name = feature_name[node_id]
            threshold = round(tree_.threshold[node_id], 2)
            left_child = recurse(tree_.children_left[node_id])
            right_child = recurse(tree_.children_right[node_id])
            return {
                "name": f"{name} <= {threshold}",
                "feature": name,
                "threshold": threshold,
                "children": [left_child, right_child]
            }
        else:
            # It's a leaf node
            class_distribution = tree_.value[node_id][0]
            class_index = int(class_distribution.argmax())
            class_name = class_names[class_index]
            return {"name": f"Class: {class_name}"}

    return recurse(0)

feature_names = features.columns
class_names = clf.classes_
tree_json = tree_to_dict(clf, feature_names, class_names)

with open('nba_tree.json', 'w') as f:
    json.dump(tree_json, f, indent=2)

print("\nDecision tree structure exported to nba_tree.json")

# --- Export the test data to JSON ---
test_data_list = []
X_test_dict = X_test.to_dict(orient='records')
y_test_list = y_test.tolist()

for i in range(len(X_test_dict)):
    idx = X_test.index[i]
    player_name = player_names.loc[idx]
    instance = {
        "player_name": player_name,
        "features": X_test_dict[i],
        "actual_class_name": y_test_list[i]
    }
    test_data_list.append(instance)

with open('test_data.json', 'w') as f:
    json.dump(test_data_list, f, indent=2)

print("Test data exported to test_data.json")
