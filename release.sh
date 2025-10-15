pushd . > /dev/null

rm -r ./docs | echo 'None'

git checkout release/v1
git merge master -m "merge current master"

mkdir -p docs

cp -r build/web-mobile/ docs/ 

git add docs
git commit -m "published new version"
git push

git checkout master

popd > /dev/null